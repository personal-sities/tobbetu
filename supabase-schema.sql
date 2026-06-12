create extension if not exists pgcrypto;

create table if not exists public.admission_notes (
  id uuid primary key default gen_random_uuid(),
  university_id uuid not null,
  category text not null check (category in ('script', 'sales')),
  language text not null default 'uz',
  title text not null,
  body text not null,
  priority integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists admission_notes_lookup_idx
  on public.admission_notes (university_id, language, category, priority, updated_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_admission_notes_updated_at on public.admission_notes;

create trigger set_admission_notes_updated_at
before update on public.admission_notes
for each row
execute function public.set_updated_at();

alter table public.admission_notes enable row level security;

drop policy if exists "Public read admission notes" on public.admission_notes;
create policy "Public read admission notes"
on public.admission_notes
for select
to anon
using (true);

-- Simple client-side edit mode uchun. Production muhitida Supabase Auth yoki Edge Function bilan almashtiring.
drop policy if exists "Public insert admission notes" on public.admission_notes;
create policy "Public insert admission notes"
on public.admission_notes
for insert
to anon
with check (true);

drop policy if exists "Public update admission notes" on public.admission_notes;
create policy "Public update admission notes"
on public.admission_notes
for update
to anon
using (true)
with check (true);

drop policy if exists "Public delete admission notes" on public.admission_notes;
create policy "Public delete admission notes"
on public.admission_notes
for delete
to anon
using (true);
