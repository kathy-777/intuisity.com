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

create index if not exists analytics_events_email_idx on analytics_events (email);
create index if not exists analytics_events_module_label_idx on analytics_events (module_label);
create index if not exists daily_results_email_idx on daily_results (email);
create index if not exists module_feedback_email_idx on module_feedback (email);

alter table profiles add column if not exists time_zone text;
alter table analytics_events add column if not exists active_duration_ms integer default 0;
