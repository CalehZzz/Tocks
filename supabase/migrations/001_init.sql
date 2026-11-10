-- Tocks multi-tenant inventory schema
-- Run in Supabase SQL Editor (or: supabase db push)

create extension if not exists "pgcrypto";

-- ── Profiles ──────────────────────────────────────────────
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  display_name text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = id);

create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id);

create policy "profiles_insert_own"
  on public.profiles for insert
  with check (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── Stores (tenants) ──────────────────────────────────────
create table if not exists public.stores (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  currency text not null default 'USD',
  owner_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists stores_owner_idx on public.stores (owner_id);

alter table public.stores enable row level security;

-- ── Store members ─────────────────────────────────────────
create table if not exists public.store_members (
  store_id uuid not null references public.stores (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null check (role in ('owner', 'admin', 'staff')),
  created_at timestamptz not null default now(),
  primary key (store_id, user_id)
);

create index if not exists store_members_user_idx on public.store_members (user_id);

alter table public.store_members enable row level security;

-- Helper: membership check (security definer to avoid RLS recursion)
create or replace function public.is_store_member(p_store_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.store_members m
    where m.store_id = p_store_id and m.user_id = auth.uid()
  );
$$;

create or replace function public.is_store_admin(p_store_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.store_members m
    where m.store_id = p_store_id
      and m.user_id = auth.uid()
      and m.role in ('owner', 'admin')
  );
$$;

create policy "stores_select_member"
  on public.stores for select
  using (public.is_store_member(id));

create policy "stores_insert_authenticated"
  on public.stores for insert
  with check (auth.uid() = owner_id);

create policy "stores_update_admin"
  on public.stores for update
  using (public.is_store_admin(id));

create policy "stores_delete_owner"
  on public.stores for delete
  using (owner_id = auth.uid());

create policy "members_select_same_store"
  on public.store_members for select
  using (public.is_store_member(store_id));

create policy "members_insert_self_owner_on_create"
  on public.store_members for insert
  with check (
    user_id = auth.uid()
    and role = 'owner'
    and exists (
      select 1 from public.stores s
      where s.id = store_id and s.owner_id = auth.uid()
    )
  );

create policy "members_manage_admin"
  on public.store_members for all
  using (public.is_store_admin(store_id))
  with check (public.is_store_admin(store_id));

-- When a store is created, add owner as member
create or replace function public.handle_new_store()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.store_members (store_id, user_id, role)
  values (new.id, new.owner_id, 'owner')
  on conflict do nothing;
  return new;
end;
$$;

drop trigger if exists on_store_created on public.stores;
create trigger on_store_created
  after insert on public.stores
  for each row execute function public.handle_new_store();

-- ── Locations (sedes) ─────────────────────────────────────
create table if not exists public.locations (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores (id) on delete cascade,
  name text not null,
  code text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  unique (store_id, code)
);

create index if not exists locations_store_idx on public.locations (store_id);

alter table public.locations enable row level security;

create policy "locations_member_all"
  on public.locations for all
  using (public.is_store_member(store_id))
  with check (public.is_store_member(store_id));

-- ── Categories ────────────────────────────────────────────
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores (id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  unique (store_id, name)
);

create index if not exists categories_store_idx on public.categories (store_id);

alter table public.categories enable row level security;

create policy "categories_member_all"
  on public.categories for all
  using (public.is_store_member(store_id))
  with check (public.is_store_member(store_id));

-- ── Products ──────────────────────────────────────────────
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores (id) on delete cascade,
  name text not null,
  description text not null default '',
  cost numeric(12, 4) not null default 0 check (cost >= 0),
  price numeric(12, 4) not null default 0 check (price >= 0),
  image_url text,
  category_id uuid references public.categories (id) on delete set null,
  discount_pct numeric(5, 2) not null default 0 check (discount_pct >= 0 and discount_pct <= 100),
  sort_order int not null default 0,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists products_store_idx on public.products (store_id);
create index if not exists products_store_active_idx on public.products (store_id) where deleted_at is null;

alter table public.products enable row level security;

create policy "products_member_all"
  on public.products for all
  using (public.is_store_member(store_id))
  with check (public.is_store_member(store_id));

-- ── Stock per location ────────────────────────────────────
create table if not exists public.product_stock (
  product_id uuid not null references public.products (id) on delete cascade,
  location_id uuid not null references public.locations (id) on delete cascade,
  quantity int not null default 0 check (quantity >= 0),
  updated_at timestamptz not null default now(),
  primary key (product_id, location_id)
);

alter table public.product_stock enable row level security;

create policy "stock_member_all"
  on public.product_stock for all
  using (
    exists (
      select 1 from public.products p
      where p.id = product_id and public.is_store_member(p.store_id)
    )
  )
  with check (
    exists (
      select 1 from public.products p
      where p.id = product_id and public.is_store_member(p.store_id)
    )
  );

-- ── Sales ─────────────────────────────────────────────────
create table if not exists public.sales (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores (id) on delete cascade,
  location_id uuid not null references public.locations (id),
  seller_id uuid references auth.users (id) on delete set null,
  seller_email text,
  customer_name text not null default '',
  invoice_number text,
  subtotal numeric(12, 4) not null default 0,
  discount_pct numeric(5, 2) not null default 0,
  total numeric(12, 4) not null default 0,
  cost_total numeric(12, 4) not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists sales_store_idx on public.sales (store_id, created_at desc);

alter table public.sales enable row level security;

create policy "sales_member_select"
  on public.sales for select
  using (public.is_store_member(store_id));

create policy "sales_member_insert"
  on public.sales for insert
  with check (public.is_store_member(store_id));

create table if not exists public.sale_items (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references public.sales (id) on delete cascade,
  product_id uuid references public.products (id) on delete set null,
  product_name text not null,
  qty int not null check (qty > 0),
  unit_price numeric(12, 4) not null,
  discount_pct numeric(5, 2) not null default 0,
  line_total numeric(12, 4) not null,
  cost_total numeric(12, 4) not null default 0
);

create index if not exists sale_items_sale_idx on public.sale_items (sale_id);

alter table public.sale_items enable row level security;

create policy "sale_items_member_all"
  on public.sale_items for all
  using (
    exists (
      select 1 from public.sales s
      where s.id = sale_id and public.is_store_member(s.store_id)
    )
  )
  with check (
    exists (
      select 1 from public.sales s
      where s.id = sale_id and public.is_store_member(s.store_id)
    )
  );

-- Atomic POS checkout: create sale, items, decrement stock
create or replace function public.checkout_sale(
  p_store_id uuid,
  p_location_id uuid,
  p_customer_name text,
  p_discount_pct numeric,
  p_items jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sale_id uuid;
  v_seller uuid := auth.uid();
  v_email text;
  v_subtotal numeric(12,4) := 0;
  v_total numeric(12,4) := 0;
  v_cost numeric(12,4) := 0;
  v_invoice text;
  v_seq bigint;
  item jsonb;
  v_product products%rowtype;
  v_qty int;
  v_unit numeric(12,4);
  v_line numeric(12,4);
  v_line_cost numeric(12,4);
  v_stock int;
begin
  if not public.is_store_member(p_store_id) then
    raise exception 'Not a store member';
  end if;

  select email into v_email from public.profiles where id = v_seller;

  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Cart is empty';
  end if;

  for item in select * from jsonb_array_elements(p_items)
  loop
    select * into v_product from public.products
    where id = (item->>'product_id')::uuid
      and store_id = p_store_id
      and deleted_at is null
    for update;

    if not found then
      raise exception 'Product not found';
    end if;

    v_qty := (item->>'qty')::int;
    if v_qty is null or v_qty <= 0 then
      raise exception 'Invalid quantity';
    end if;

    select quantity into v_stock
    from public.product_stock
    where product_id = v_product.id and location_id = p_location_id
    for update;

    if coalesce(v_stock, 0) < v_qty then
      raise exception 'Insufficient stock for %', v_product.name;
    end if;

    v_unit := coalesce(nullif(item->>'unit_price','')::numeric, v_product.price);
    v_line := round(v_unit * v_qty * (1 - coalesce(v_product.discount_pct,0) / 100.0), 4);
    v_line_cost := round(v_product.cost * v_qty, 4);
    v_subtotal := v_subtotal + v_line;
    v_cost := v_cost + v_line_cost;
  end loop;

  v_total := round(v_subtotal * (1 - coalesce(p_discount_pct,0) / 100.0), 4);

  select count(*) + 1 into v_seq from public.sales where store_id = p_store_id;
  v_invoice := 'FAC-' || lpad(v_seq::text, 5, '0');

  insert into public.sales (
    store_id, location_id, seller_id, seller_email, customer_name,
    invoice_number, subtotal, discount_pct, total, cost_total
  ) values (
    p_store_id, p_location_id, v_seller, v_email, coalesce(p_customer_name,''),
    v_invoice, v_subtotal, coalesce(p_discount_pct,0), v_total, v_cost
  ) returning id into v_sale_id;

  for item in select * from jsonb_array_elements(p_items)
  loop
    select * into v_product from public.products
    where id = (item->>'product_id')::uuid;

    v_qty := (item->>'qty')::int;
    v_unit := coalesce(nullif(item->>'unit_price','')::numeric, v_product.price);
    v_line := round(v_unit * v_qty * (1 - coalesce(v_product.discount_pct,0) / 100.0), 4);
    v_line_cost := round(v_product.cost * v_qty, 4);

    insert into public.sale_items (
      sale_id, product_id, product_name, qty, unit_price, discount_pct, line_total, cost_total
    ) values (
      v_sale_id, v_product.id, v_product.name, v_qty, v_unit,
      coalesce(v_product.discount_pct,0), v_line, v_line_cost
    );

    update public.product_stock
    set quantity = quantity - v_qty, updated_at = now()
    where product_id = v_product.id and location_id = p_location_id;
  end loop;

  return v_sale_id;
end;
$$;

revoke all on function public.checkout_sale(uuid, uuid, text, numeric, jsonb) from public;
grant execute on function public.checkout_sale(uuid, uuid, text, numeric, jsonb) to authenticated;
