# Table access after October 30, 2026

Every new public table needs explicit role grants as well as row-level security. Add table-specific grants in its creating migration. Select roles and operations from the actual API callers; do not use schema-wide grants or default privileges as a shortcut. Private portal tables use authenticated access constrained by their existing owner/admin RLS policies. Profile writes use explicit column grants excluding role; activity history allows SELECT/INSERT but cannot be rewritten or deleted by authenticated clients. Only the service provider directory and two public SEO metrics tables grant anonymous SELECT. Agent-only SEO strategy logs grant service_role access alone.

The October 2026 grants added to historical migrations make fresh installations explicit. They are not a live migration or an instruction to replay historical migrations against an existing project. Existing table privileges remain in place under the announced Supabase change. Any existing-project privilege repair requires its own reviewed forward migration after verifying actual grants and callers.

The website also consumes shared tables created in other repositories, including blog_posts, outreach_sequences and fb_leads. Those tables need their creation migrations audited in the owning repository; this directory does not define or grant their full API contract.

Before committing schema changes, run `python3 scripts/check-migration-grants.py` and `python3 scripts/test-migration-grants.py`. The guard requires named-table grants beside every CREATE TABLE; it does not validate whether the selected roles or RLS policies are appropriate, which remains part of review.

`npm run test:migration-grants` also replays actual table DDL and grants in isolated PGlite PostgreSQL. It verifies protected profile columns and all four operations for all three roles on the twelve owned tables, rejects private table reads, checks a real yacht-owner RLS policy, and proves omission of grants denies access. Shared blog_posts and dashboard-created valuation_leads are foreign-key stubs; this is not a full historical migration-chain replay.

The lightweight authoring guard deliberately fails closed on unqualified or quoted table declarations; use the repository public.unquoted_name convention or extend the parser and tests. PostgreSQL role/operation tests remain authoritative for actual privileges. Both checks are included in npm test.
