-- Merkel Engineering: Supabase schema
-- Run this once in the Supabase dashboard under SQL Editor -> New query.
--
-- The server talks to these tables with the service-role key, which bypasses
-- row level security. RLS is enabled with no public policies so that the anon
-- key (if it ever reaches a browser) cannot read or write anything.

-- Contact form enquiries -----------------------------------------------------
create table if not exists public.enquiries (
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
  on public.enquiries (received_at desc);

-- Live chat transcripts ------------------------------------------------------
create table if not exists public.chat_messages (
  id          bigserial primary key,
  session_id  text        not null,
  role        text        not null check (role in ('user', 'agent')),
  text        text        not null,
  created_at  timestamptz not null default now()
);

create index if not exists chat_messages_session_idx
  on public.chat_messages (session_id, created_at);

-- Inbound email archive ------------------------------------------------------
create table if not exists public.inbound_emails (
  id           bigserial primary key,
  message_id   text,
  from_address text,
  to_address   text,
  subject      text,
  body         text,
  received_at  timestamptz not null default now()
);

create index if not exists inbound_emails_received_at_idx
  on public.inbound_emails (received_at desc);

-- Lock the tables down to the service role -----------------------------------
alter table public.enquiries      enable row level security;
alter table public.chat_messages  enable row level security;
alter table public.inbound_emails enable row level security;
