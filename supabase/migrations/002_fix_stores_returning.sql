-- Allow owners to read their store row during INSERT ... RETURNING
-- (membership trigger can race the SELECT RLS check).

drop policy if exists "stores_select_member" on public.stores;

create policy "stores_select_member"
  on public.stores for select
  using (
    owner_id = auth.uid()
    or public.is_store_member(id)
  );
