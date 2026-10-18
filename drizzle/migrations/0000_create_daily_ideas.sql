create table public.daily_ideas (
  id uuid primary key default gen_random_uuid(),
  day date not null unique,
  topic text not null,
  hook text not null,
  bit text not null,
  tag text not null,
  created_at timestamptz not null default now()
);
grant select on public.daily_ideas to anon, authenticated;
grant all on public.daily_ideas to service_role;
alter table public.daily_ideas enable row level security;
create policy "Anyone can read daily ideas" on public.daily_ideas for select to anon, authenticated using (true);