-- Run this in Supabase SQL Editor to add Q&A for General Session (single room)
--
-- This project uses two tables:
--   qa_sessions  (one row per room/slug)
--   qa_questions (questions tied to a session)
--
-- Default room slug used by the app:  general-session
--
-- Optional (recommended): this script also enables RLS with safe public read access
-- for approved questions only. The app's server routes use the service role key,
-- so moderation and inserts still work regardless of RLS.

create table if not exists public.qa_sessions (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  enabled boolean not null default true,
  allow_anonymous boolean not null default false,
  created_at timestamptz not null default now()
);

insert into public.qa_sessions (slug, enabled, allow_anonymous)
values ('general-session', true, false)
on conflict (slug) do nothing;

create table if not exists public.qa_questions (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.qa_sessions(id) on delete cascade,
  asked_by text null,
  asked_by_user_id uuid null,
  question text not null,
  status text not null default 'pending', -- pending | approved | hidden
  pinned boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists qa_questions_session_created_idx
  on public.qa_questions(session_id, created_at desc);

create index if not exists qa_questions_session_status_idx
  on public.qa_questions(session_id, status);

-- -----------------------------
-- Optional: RLS hardening
-- -----------------------------
alter table public.qa_sessions enable row level security;
alter table public.qa_questions enable row level security;

-- Public can read the general session row (so the client can see enabled/allow_anonymous)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='qa_sessions' AND policyname='qa_sessions_select_public'
  ) THEN
    EXECUTE $$
      create policy qa_sessions_select_public
      on public.qa_sessions
      for select
      to public
      using (slug = 'general-session');
    $$;
  END IF;
END $$;

-- Public can read only APPROVED questions for general session
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='qa_questions' AND policyname='qa_questions_select_public_approved'
  ) THEN
    EXECUTE $$
      create policy qa_questions_select_public_approved
      on public.qa_questions
      for select
      to public
      using (
        status = 'approved'
        and exists (
          select 1 from public.qa_sessions s
          where s.id = qa_questions.session_id
          and s.slug = 'general-session'
        )
      );
    $$;
  END IF;
END $$;

-- Public cannot update/delete
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='qa_questions' AND policyname='qa_questions_no_update_public'
  ) THEN
    EXECUTE $$
      create policy qa_questions_no_update_public
      on public.qa_questions
      for update
      to public
      using (false);
    $$;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='qa_questions' AND policyname='qa_questions_no_delete_public'
  ) THEN
    EXECUTE $$
      create policy qa_questions_no_delete_public
      on public.qa_questions
      for delete
      to public
      using (false);
    $$;
  END IF;
END $$;
