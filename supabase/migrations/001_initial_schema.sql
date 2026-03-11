-- Profiles (linked to auth.users)
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text not null,
  full_name text not null default '',
  company_name text,
  phone text,
  avatar_url text,
  role text default 'client' check (role in ('client', 'admin')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.profiles enable row level security;
create policy "Users can view own profile" on public.profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    new.email
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Yachts (vessels owned by users)
create table public.yachts (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  name text not null,
  type text check (type in ('motor_yacht', 'sailing_yacht', 'catamaran', 'sportfisher', 'trawler', 'other')),
  manufacturer text,
  model text,
  year integer,
  length_m decimal(6,1),
  beam_m decimal(5,1),
  draft_m decimal(5,1),
  max_speed_knots integer,
  cabins integer,
  guests integer,
  range_nm integer,
  engine text,
  location text,
  status text default 'active' check (status in ('active', 'in_marina', 'maintenance', 'for_sale', 'sold')),
  image_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_yachts_user_id on public.yachts(user_id);
alter table public.yachts enable row level security;
create policy "Users can view own yachts" on public.yachts for select using (auth.uid() = user_id);
create policy "Users can manage own yachts" on public.yachts for all using (auth.uid() = user_id);

-- Documents (certificates, registrations, manuals, insurance, warranties)
create table public.documents (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  yacht_id uuid references public.yachts(id) on delete cascade,
  title text not null,
  description text,
  category text not null check (category in ('certificate', 'registration', 'owner_manual', 'coast_guard', 'insurance', 'warranty')),
  file_name text not null,
  file_type text,
  file_size bigint,
  storage_path text not null,
  page_count integer,
  status text default 'active' check (status in ('active', 'current', 'expiring_soon', 'expired')),
  tags text[] default '{}',
  expires_at date,
  uploaded_at timestamptz default now(),
  created_at timestamptz default now()
);

create index idx_documents_user_id on public.documents(user_id);
create index idx_documents_yacht_id on public.documents(yacht_id);
alter table public.documents enable row level security;
create policy "Users can view own documents" on public.documents for select using (auth.uid() = user_id);
create policy "Users can manage own documents" on public.documents for all using (auth.uid() = user_id);

-- Maintenance records
create table public.maintenance_records (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  yacht_id uuid references public.yachts(id) on delete cascade,
  title text not null,
  description text,
  category text not null check (category in ('engine', 'hull_paint', 'electrical', 'rigging', 'cleaning', 'annual_survey', 'other')),
  technician text,
  cost decimal(10,2),
  status text default 'complete' check (status in ('complete', 'pending', 'scheduled', 'overdue')),
  service_date timestamptz not null,
  follow_up_status text check (follow_up_status in ('none', 'scheduled', 'overdue')),
  file_name text,
  file_type text,
  file_size bigint,
  storage_path text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_maintenance_user_id on public.maintenance_records(user_id);
create index idx_maintenance_yacht_id on public.maintenance_records(yacht_id);
alter table public.maintenance_records enable row level security;
create policy "Users can view own maintenance" on public.maintenance_records for select using (auth.uid() = user_id);
create policy "Users can manage own maintenance" on public.maintenance_records for all using (auth.uid() = user_id);

-- Service providers (insurance agents, captains, technicians, etc.)
create table public.service_providers (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  title text,
  company text,
  category text not null check (category in ('insurance', 'captain_crew', 'berth_marina', 'engine_boat')),
  bio text,
  phone text,
  email text,
  avatar_url text,
  credentials text[] default '{}',
  is_preferred boolean default false,
  status text default 'available' check (status in ('available', 'unavailable', 'booked')),
  created_at timestamptz default now()
);

alter table public.service_providers enable row level security;
create policy "Anyone can view service providers" on public.service_providers for select using (true);

-- Activity log
create table public.activity_log (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  yacht_id uuid references public.yachts(id) on delete set null,
  action text not null,
  description text,
  created_at timestamptz default now()
);

create index idx_activity_user_id on public.activity_log(user_id);
alter table public.activity_log enable row level security;
create policy "Users can view own activity" on public.activity_log for select using (auth.uid() = user_id);
