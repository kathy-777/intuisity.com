create table if not exists profiles (
  email text primary key,
  name text,
  phone text,
  language text,
  reminder_time text,
  time_zone text,
  birthdate text,
  birth_time text,
  birth_city text,
  birth_state text,
  birth_country text,
  current_city text,
  current_state text,
  current_country text,
  profile_json jsonb default '{}'::jsonb,
  updated_at timestamptz default now()
);

create table if not exists daily_answers (
  email text not null,
  date date not null,
  answers jsonb default '{}'::jsonb,
  updated_at timestamptz default now(),
  primary key (email, date)
);

create table if not exists daily_results (
  email text not null,
  date date not null,
  modules jsonb default '[]'::jsonb,
  total numeric default 0,
  maximum numeric default 0,
  updated_at timestamptz default now(),
  primary key (email, date)
);

create table if not exists analytics_events (
  id bigserial primary key,
  email text not null,
  module_id text,
  module_label text,
  started_at timestamptz,
  duration_ms integer default 0,
  active_duration_ms integer default 0,
  date date default current_date,
  event_json jsonb default '{}'::jsonb,
  recorded_at timestamptz default now()
);

create table if not exists module_feedback (
  email text not null,
  module_label text not null,
  rating integer default 0,
  improvement text default '',
  saved_at timestamptz default now(),
  primary key (email, module_label)
);

create table if not exists friends (
  email text primary key,
  friends jsonb default '[]'::jsonb,
  updated_at timestamptz default now()
);

create table if not exists treasure_challenges (
  id uuid primary key,
  sender_token text not null,
  competition_id uuid,
  sender_email text not null,
  sender_name text not null,
  friend_email text not null,
  friend_name text not null,
  tiles jsonb not null,
  note text default '',
  response_tiles jsonb,
  attempt_count integer default 0,
  solved boolean default false,
  solved_at timestamptz,
  completion_duration_ms bigint,
  status text not null default 'sent' check (status in ('sent', 'opened', 'completed')),
  sent_at timestamptz not null default now(),
  opened_at timestamptz,
  completed_at timestamptz,
  invite_delivery_id text,
  invite_delivery_status text default 'sent',
  opened_delivery_id text,
  completed_delivery_id text,
  email_error text,
  updated_at timestamptz not null default now()
);

create index if not exists analytics_events_email_idx on analytics_events (email);
create index if not exists analytics_events_module_label_idx on analytics_events (module_label);
create index if not exists daily_results_email_idx on daily_results (email);
create index if not exists module_feedback_email_idx on module_feedback (email);
create index if not exists treasure_challenges_sender_email_idx on treasure_challenges (sender_email);
create index if not exists treasure_challenges_status_idx on treasure_challenges (status);

alter table profiles add column if not exists time_zone text;
alter table analytics_events add column if not exists active_duration_ms integer default 0;
alter table treasure_challenges add column if not exists competition_id uuid;
alter table treasure_challenges add column if not exists attempt_count integer default 0;
alter table treasure_challenges add column if not exists solved boolean default false;
alter table treasure_challenges add column if not exists solved_at timestamptz;
alter table treasure_challenges add column if not exists completion_duration_ms bigint;
alter table treasure_challenges add column if not exists invite_delivery_status text default 'sent';
create index if not exists treasure_challenges_competition_id_idx on treasure_challenges (competition_id);
