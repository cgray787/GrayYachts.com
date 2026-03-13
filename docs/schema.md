# Database Schema Reference

Supabase PostgreSQL with Row Level Security (RLS) enabled on all tables.

## Tables

### profiles
User accounts linked to Supabase Auth.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid (PK) | References `auth.users` |
| email | text | Required |
| full_name | text | Default '' |
| company_name | text | |
| phone | text | |
| avatar_url | text | |
| role | text | 'client' or 'admin' |
| created_at | timestamptz | |
| updated_at | timestamptz | |

Auto-created on signup via `handle_new_user()` trigger.

### yachts
Vessels owned by users.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid (PK) | Auto-generated |
| user_id | uuid (FK) | References profiles |
| name | text | Required |
| type | text | motor_yacht, sailing_yacht, catamaran, sportfisher, trawler, other |
| manufacturer | text | |
| model | text | |
| year | integer | |
| length_m | decimal(6,1) | |
| beam_m | decimal(5,1) | |
| draft_m | decimal(5,1) | |
| max_speed_knots | integer | |
| cabins | integer | |
| guests | integer | |
| range_nm | integer | |
| engine | text | |
| engine_hours | integer | Added in migration 003 |
| location | text | |
| status | text | active, in_marina, maintenance, for_sale, sold |
| image_url | text | |
| created_at | timestamptz | |
| updated_at | timestamptz | |

### documents
Uploaded files (certificates, registrations, manuals, insurance, warranties).

| Column | Type | Notes |
|--------|------|-------|
| id | uuid (PK) | |
| user_id | uuid (FK) | References profiles |
| yacht_id | uuid (FK) | References yachts (nullable) |
| title | text | Required |
| description | text | |
| category | text | certificate, registration, owner_manual, coast_guard, insurance, warranty |
| file_name | text | Required |
| file_type | text | |
| file_size | bigint | |
| storage_path | text | Required |
| page_count | integer | |
| status | text | active, current, expiring_soon, expired |
| tags | text[] | Default '{}' |
| expires_at | date | |
| uploaded_at | timestamptz | |
| created_at | timestamptz | |

### maintenance_records
Service history per yacht.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid (PK) | |
| user_id | uuid (FK) | References profiles |
| yacht_id | uuid (FK) | References yachts (nullable) |
| title | text | Required |
| description | text | |
| category | text | engine, hull_paint, electrical, rigging, cleaning, annual_survey, other |
| technician | text | |
| cost | decimal(10,2) | |
| status | text | complete, pending, scheduled, overdue |
| service_date | timestamptz | Required |
| follow_up_status | text | none, scheduled, overdue |
| file_name | text | |
| file_type | text | |
| file_size | bigint | |
| storage_path | text | |
| created_at | timestamptz | |
| updated_at | timestamptz | |

### service_providers
Directory of yacht service professionals.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid (PK) | |
| name | text | Required |
| title | text | |
| company | text | |
| category | text | insurance, captain_crew, berth_marina, engine_boat |
| bio | text | |
| phone | text | |
| email | text | |
| avatar_url | text | |
| credentials | text[] | Default '{}' |
| is_preferred | boolean | Default false |
| status | text | available, unavailable, booked |
| created_at | timestamptz | |

### activity_log
Audit trail of user actions.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid (PK) | |
| user_id | uuid (FK) | References profiles |
| yacht_id | uuid (FK) | References yachts (nullable, set null on delete) |
| action | text | Required |
| description | text | |
| created_at | timestamptz | |

## RLS Policies

**User-level (all tables except service_providers):**
- `profiles`: Users can view/update/insert own profile
- `yachts`, `documents`, `maintenance_records`, `activity_log`: Users have full CRUD on own records (`for all` with `using/with check` on `user_id`)

**Admin-level:**
- Admins (role = 'admin') have `select` on all tables (via migration 002)
- Admins have full `for all` CRUD on profiles, yachts, documents, maintenance_records, activity_log (via migration 003)
- Admins can manage service_providers (via migration 002)

**Public:**
- `service_providers`: Anyone can view (`for select using (true)`)

**Trigger:**
- `on_auth_user_created` → `handle_new_user()`: Auto-creates profile row on signup

## Migrations

- `001_initial_schema.sql` — All tables, indexes, base RLS policies, signup trigger
- `002_fix_rls_policies.sql` — Consolidated duplicate select/all policies, added admin select and service provider management
- `003_add_engine_hours_and_policy_fixes.sql` — `engine_hours` column on yachts, admin `for all` CRUD on every table, user insert policy on profiles
