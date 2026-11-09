-- SHEEP PALPITES — schema inicial Supabase
create extension if not exists pgcrypto;

create table if not exists public.matches (
 id uuid primary key default gen_random_uuid(),
 provider_match_id text unique,
 competition text not null,
 home_team text not null,
 away_team text not null,
 kickoff_at timestamptz not null,
 status text not null default 'scheduled',
 source text not null,
 created_at timestamptz not null default now()
);

create table if not exists public.market_snapshots (
 id uuid primary key default gen_random_uuid(),
 match_id uuid not null references public.matches(id) on delete cascade,
 market text not null check (market in ('goals','corners','cards','shots','shots_on_target')),
 home_expected numeric not null,
 away_expected numeric not null,
 data_quality numeric not null default 0 check (data_quality between 0 and 1),
 source_updated_at timestamptz,
 model_version text not null,
 created_at timestamptz not null default now()
);

create table if not exists public.picks (
 id uuid primary key default gen_random_uuid(),
 snapshot_id uuid not null references public.market_snapshots(id) on delete cascade,
 side text not null check (side in ('favorite','underdog')),
 team text not null,
 asian_line numeric not null,
 cover_probability numeric not null check (cover_probability between 0 and 1),
 confidence text not null check (confidence in ('Baixa','Média','Alta')),
 rationale text not null,
 created_at timestamptz not null default now()
);

create table if not exists public.results (
 id uuid primary key default gen_random_uuid(),
 match_id uuid not null references public.matches(id) on delete cascade,
 home_score integer,
 away_score integer,
 home_corners integer,
 away_corners integer,
 home_cards numeric,
 away_cards numeric,
 home_shots integer,
 away_shots integer,
 source text not null,
 confirmed_at timestamptz,
 created_at timestamptz not null default now()
);

alter table public.matches enable row level security;
alter table public.market_snapshots enable row level security;
alter table public.picks enable row level security;
alter table public.results enable row level security;

-- Políticas públicas de leitura somente para dados publicados.
create policy "public read matches" on public.matches for select using (true);
create policy "public read snapshots" on public.market_snapshots for select using (true);
create policy "public read picks" on public.picks for select using (true);
create policy "public read results" on public.results for select using (true);
