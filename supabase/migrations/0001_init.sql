-- GeoKhel schema. Run once in the Supabase SQL editor (or `supabase db push`).
-- The app talks to these tables only from the server with the service role key,
-- so row level security is enabled with no policies: the public anon key can read nothing.

create table if not exists players (
  id uuid primary key default gen_random_uuid(),
  token_hash text not null unique,
  nickname text not null check (char_length(nickname) between 2 and 20),
  state text not null,
  created_at timestamptz not null default now()
);

-- One row per answered daily question. The primary key stops a second try at the same question.
create table if not exists guesses (
  player_id uuid not null references players(id) on delete cascade,
  day date not null,
  idx smallint not null check (idx between 0 and 4),
  points smallint not null,
  km real not null,
  lat real not null,
  lon real not null,
  created_at timestamptz not null default now(),
  primary key (player_id, day, idx)
);

create table if not exists results (
  player_id uuid not null references players(id) on delete cascade,
  day date not null,
  total smallint not null,
  points smallint[] not null,
  created_at timestamptz not null default now(),
  primary key (player_id, day)
);
create index if not exists results_day_total on results (day, total desc);

create table if not exists groups (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null check (char_length(name) between 2 and 40),
  owner_id uuid not null references players(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists group_members (
  group_id uuid not null references groups(id) on delete cascade,
  player_id uuid not null references players(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (group_id, player_id)
);
create index if not exists group_members_player on group_members (player_id);

alter table players enable row level security;
alter table guesses enable row level security;
alter table results enable row level security;
alter table groups enable row level security;
alter table group_members enable row level security;

-- Average daily score per state, for the state-vs-state table.
create or replace function state_board(d date)
returns table (state text, players bigint, average numeric)
language sql stable
as $$
  select p.state, count(*) as players, round(avg(r.total), 0) as average
  from results r join players p on p.id = r.player_id
  where r.day = d
  group by p.state
  order by average desc, players desc;
$$;
revoke execute on function state_board(date) from public, anon, authenticated;
