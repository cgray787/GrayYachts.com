-- Add engine_hours column to yachts table
-- (Used in Compare Yachts for side-by-side comparison specs)

alter table public.yachts
  add column if not exists engine_hours integer;

-- Add with check clause to "for all" policies that were missing it
-- in the initial migration. The 002 migration already fixed some of these,
-- but the profiles table still lacks a "for all" insert/update/delete policy.

-- Allow users to insert their own profile (needed for edge cases)
create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

-- Admins: full management of all profiles
create policy "Admins can manage all profiles"
  on public.profiles for all
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

-- Admins: full management of all yachts (not just select)
create policy "Admins can manage all yachts"
  on public.yachts for all
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

-- Admins: full management of all documents
create policy "Admins can manage all documents"
  on public.documents for all
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

-- Admins: full management of all maintenance records
create policy "Admins can manage all maintenance"
  on public.maintenance_records for all
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

-- Admins: full management of activity log
create policy "Admins can manage all activity"
  on public.activity_log for all
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
