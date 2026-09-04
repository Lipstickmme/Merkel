-- Merkel Engineering: database schema (Postgres)
--
-- Works as-is on Neon. Run it once in the Neon Console under SQL Editor,
-- or with psql:  psql "$DATABASE_URL" -f db/schema.sql

-- Contact form enquiries -----------------------------------------------------
create table if not exists enquiries (
  id           uuid primary key,
  name         text        not null,
  email        text        not null,
  company      text,
  service      text,
  message      text        not null,
  ip           text,
  received_at  timestamptz not null default now()
);

create index if not exists enquiries_received_at_idx
  on enquiries (received_at desc);

-- Live chat transcripts ------------------------------------------------------
create table if not exists chat_messages (
  id          bigserial primary key,
  session_id  text        not null,
  role        text        not null check (role in ('user', 'agent')),
  text        text        not null,
  created_at  timestamptz not null default now()
);

create index if not exists chat_messages_session_idx
  on chat_messages (session_id, created_at);

-- Inbound email archive ------------------------------------------------------
create table if not exists inbound_emails (
  id           bigserial primary key,
  message_id   text,
  from_address text,
  to_address   text,
  subject      text,
  body         text,
  received_at  timestamptz not null default now()
);

create index if not exists inbound_emails_received_at_idx
  on inbound_emails (received_at desc);

-- Supabase only --------------------------------------------------------------
-- Neon has no public anon key, so these are unnecessary there. On Supabase,
-- also run the following so the anon key cannot read or write these tables.
--
--   alter table enquiries      enable row level security;
--   alter table chat_messages  enable row level security;
--   alter table inbound_emails enable row level security;
