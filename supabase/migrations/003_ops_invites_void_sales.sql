-- Soft-delete sales, invites for POS staff, soft-delete stores/locations,
-- storage bucket for product images.

alter table public.sales
  add column if not exists deleted_at timestamptz,
  add column if not exists deleted_by uuid references auth.users (id) on delete set null;

alter table public.stores
  add column if not exists deleted_at timestamptz;

alter table public.locations
  add column if not exists deleted_at timestamptz;

create index if not exists sales_store_active_idx
  on public.sales (store_id, created_at desc)
  where deleted_at is null;

-- Allow members to update sales (void/restore) and stores/locations
drop policy if exists "sales_member_update" on public.sales;
create policy "sales_member_update"
  on public.sales for update
  using (public.is_store_member(store_id))
  with check (public.is_store_member(store_id));

-- ── Invites ───────────────────────────────────────────────
create table if not exists public.store_invites (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores (id) on delete cascade,
  email text not null,
  display_name text not null default '',
  role text not null check (role in ('admin', 'staff')),
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  accepted_at timestamptz,
  unique (store_id, email)
);

create index if not exists store_invites_email_idx
  on public.store_invites (lower(email));

alter table public.store_invites enable row level security;

create policy "invites_admin_all"
  on public.store_invites for all
  using (public.is_store_admin(store_id))
  with check (public.is_store_admin(store_id));

create policy "invites_select_own_email"
  on public.store_invites for select
  using (
    lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );

-- Claim pending invites when user signs in / profile exists
create or replace function public.claim_store_invites()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_email text;
  v_count int := 0;
  r record;
begin
  if v_uid is null then
    return 0;
  end if;

  select email into v_email from public.profiles where id = v_uid;
  if v_email is null then
    v_email := auth.jwt() ->> 'email';
  end if;
  if v_email is null or v_email = '' then
    return 0;
  end if;

  for r in
    select * from public.store_invites
    where lower(email) = lower(v_email)
      and accepted_at is null
  loop
    insert into public.store_members (store_id, user_id, role)
    values (r.store_id, v_uid, r.role)
    on conflict (store_id, user_id) do update
      set role = excluded.role;

    update public.store_invites
    set accepted_at = now()
    where id = r.id;

    update public.profiles
    set display_name = coalesce(nullif(display_name, ''), nullif(r.display_name, ''), display_name)
    where id = v_uid;

    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

revoke all on function public.claim_store_invites() from public;
grant execute on function public.claim_store_invites() to authenticated;

-- Void sale: mark deleted + restore stock
create or replace function public.void_sale(p_sale_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sale public.sales%rowtype;
  r record;
begin
  select * into v_sale from public.sales where id = p_sale_id for update;
  if not found then
    raise exception 'Venta no encontrada';
  end if;
  if not public.is_store_admin(v_sale.store_id) and not public.is_store_member(v_sale.store_id) then
    raise exception 'Sin permiso';
  end if;
  if v_sale.deleted_at is not null then
    raise exception 'La venta ya está anulada';
  end if;

  for r in
    select * from public.sale_items where sale_id = p_sale_id
  loop
    if r.product_id is not null then
      insert into public.product_stock (product_id, location_id, quantity, updated_at)
      values (r.product_id, v_sale.location_id, r.qty, now())
      on conflict (product_id, location_id) do update
        set quantity = public.product_stock.quantity + excluded.quantity,
            updated_at = now();
    end if;
  end loop;

  update public.sales
  set deleted_at = now(), deleted_by = auth.uid()
  where id = p_sale_id;
end;
$$;

revoke all on function public.void_sale(uuid) from public;
grant execute on function public.void_sale(uuid) to authenticated;

-- Restore voided sale: clear deleted + decrement stock again
create or replace function public.restore_sale(p_sale_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sale public.sales%rowtype;
  r record;
  v_stock int;
begin
  select * into v_sale from public.sales where id = p_sale_id for update;
  if not found then
    raise exception 'Venta no encontrada';
  end if;
  if not public.is_store_member(v_sale.store_id) then
    raise exception 'Sin permiso';
  end if;
  if v_sale.deleted_at is null then
    raise exception 'La venta no está anulada';
  end if;

  for r in
    select * from public.sale_items where sale_id = p_sale_id
  loop
    if r.product_id is not null then
      select quantity into v_stock
      from public.product_stock
      where product_id = r.product_id and location_id = v_sale.location_id
      for update;

      if coalesce(v_stock, 0) < r.qty then
        raise exception 'Stock insuficiente para restaurar la venta';
      end if;

      update public.product_stock
      set quantity = quantity - r.qty, updated_at = now()
      where product_id = r.product_id and location_id = v_sale.location_id;
    end if;
  end loop;

  update public.sales
  set deleted_at = null, deleted_by = null
  where id = p_sale_id;
end;
$$;

revoke all on function public.restore_sale(uuid) from public;
grant execute on function public.restore_sale(uuid) to authenticated;

-- Product images bucket (Supabase Storage — not the database)
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

drop policy if exists "product_images_public_read" on storage.objects;
create policy "product_images_public_read"
  on storage.objects for select
  using (bucket_id = 'product-images');

drop policy if exists "product_images_member_upload" on storage.objects;
create policy "product_images_member_upload"
  on storage.objects for insert
  with check (
    bucket_id = 'product-images'
    and auth.role() = 'authenticated'
  );

drop policy if exists "product_images_member_update" on storage.objects;
create policy "product_images_member_update"
  on storage.objects for update
  using (bucket_id = 'product-images' and auth.role() = 'authenticated');

drop policy if exists "product_images_member_delete" on storage.objects;
create policy "product_images_member_delete"
  on storage.objects for delete
  using (bucket_id = 'product-images' and auth.role() = 'authenticated');
