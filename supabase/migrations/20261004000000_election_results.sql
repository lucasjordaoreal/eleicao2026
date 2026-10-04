create table if not exists public.election_results (
  singleton boolean primary key default true check (singleton),
  snapshot jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.election_results enable row level security;

revoke all on public.election_results from anon, authenticated;
grant select on public.election_results to anon, authenticated;

drop policy if exists "Election results are publicly readable" on public.election_results;
create policy "Election results are publicly readable"
  on public.election_results
  for select
  to anon, authenticated
  using (true);
