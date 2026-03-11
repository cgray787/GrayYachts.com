-- Fix redundant RLS policies: "for all" already covers SELECT,
-- so drop the duplicate SELECT-only policies.

drop policy if exists "Users can view own yachts" on public.yachts;
drop policy if exists "Users can view own documents" on public.documents;
drop policy if exists "Users can view own maintenance" on public.maintenance_records;
drop policy if exists "Users can view own activity" on public.activity_log;

-- Rename the "for all" policies to be clearer
-- (Postgres doesn't have ALTER POLICY ... RENAME, so drop + recreate)

drop policy if exists "Users can manage own yachts" on public.yachts;
create policy "Users can access own yachts"
  on public.yachts for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can manage own documents" on public.documents;
create policy "Users can access own documents"
  on public.documents for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can manage own maintenance" on public.maintenance_records;
create policy "Users can access own maintenance"
  on public.maintenance_records for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Activity log: users can view own, but inserts should also be allowed
create policy "Users can access own activity"
  on public.activity_log for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Admin access: allow admins (role = 'admin') to read all data
create policy "Admins can view all profiles"
  on public.profiles for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

create policy "Admins can view all yachts"
  on public.yachts for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

create policy "Admins can view all documents"
  on public.documents for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

create policy "Admins can view all maintenance"
  on public.maintenance_records for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

create policy "Admins can view all activity"
  on public.activity_log for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

create policy "Admins can manage service providers"
  on public.service_providers for all
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );
