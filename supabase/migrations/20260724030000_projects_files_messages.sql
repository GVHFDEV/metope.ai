-- Core schema for Metope AI: projects, files, messages.
--
-- Ownership model: a row belongs either to a logged-in user (user_id set) or
-- to an anonymous browser session (session_id set) -- never both, never
-- neither.
--
-- RLS enforcement differs by ownership kind, matching how strong each
-- identity actually is:
--   - Logged-in rows (user_id set): DB-enforced via auth.uid() = user_id.
--     A logged-in user can never read/write another user's row, full stop.
--   - Anonymous rows (session_id set, user_id null): the anon key is shared
--     by every visitor, so Postgres has no verifiable per-visitor identity to
--     check (session_id is just a client-generated token, same trust level
--     as the pre-existing localStorage-only design). RLS allows any anon
--     request to see rows with user_id is null; the app filters further by
--     session_id client-side, exactly like the current local-only behavior.
--     This is a conscious scope boundary, not an oversight.

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete cascade,
  session_id text,
  name text not null,
  description text not null default '',
  category text not null default 'Residencial',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint projects_owner_check check (
    (user_id is not null and session_id is null) or
    (user_id is null and session_id is not null)
  )
);

create table if not exists public.files (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  user_id uuid references auth.users (id) on delete cascade,
  session_id text,
  name text not null,
  type text not null,
  mime_type text not null,
  size bigint not null,
  storage_path text not null,
  content_text text not null default '',
  created_at timestamptz not null default now(),
  constraint files_owner_check check (
    (user_id is not null and session_id is null) or
    (user_id is null and session_id is not null)
  )
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  user_id uuid references auth.users (id) on delete cascade,
  session_id text,
  role text not null,
  content text not null,
  action_type text not null default 'general',
  created_at timestamptz not null default now(),
  constraint messages_owner_check check (
    (user_id is not null and session_id is null) or
    (user_id is null and session_id is not null)
  )
);

create index if not exists projects_user_id_idx on public.projects (user_id);
create index if not exists projects_session_id_idx on public.projects (session_id);
create index if not exists files_project_id_idx on public.files (project_id);
create index if not exists files_user_id_idx on public.files (user_id);
create index if not exists messages_project_id_idx on public.messages (project_id);
create index if not exists messages_user_id_idx on public.messages (user_id);

-- Keep updated_at fresh on projects.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists projects_set_updated_at on public.projects;
create trigger projects_set_updated_at
  before update on public.projects
  for each row
  execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.projects enable row level security;
alter table public.files enable row level security;
alter table public.messages enable row level security;

create policy projects_select on public.projects
  for select
  using (user_id = auth.uid() or user_id is null);

create policy projects_insert on public.projects
  for insert
  with check (
    (auth.uid() is not null and user_id = auth.uid() and session_id is null)
    or (auth.uid() is null and user_id is null and session_id is not null)
  );

create policy projects_update on public.projects
  for update
  using (user_id = auth.uid() or user_id is null)
  with check (user_id = auth.uid() or user_id is null);

create policy projects_delete on public.projects
  for delete
  using (user_id = auth.uid() or user_id is null);

create policy files_select on public.files
  for select
  using (user_id = auth.uid() or user_id is null);

create policy files_insert on public.files
  for insert
  with check (
    (auth.uid() is not null and user_id = auth.uid() and session_id is null)
    or (auth.uid() is null and user_id is null and session_id is not null)
  );

create policy files_delete on public.files
  for delete
  using (user_id = auth.uid() or user_id is null);

create policy messages_select on public.messages
  for select
  using (user_id = auth.uid() or user_id is null);

create policy messages_insert on public.messages
  for insert
  with check (
    (auth.uid() is not null and user_id = auth.uid() and session_id is null)
    or (auth.uid() is null and user_id is null and session_id is not null)
  );

-- ---------------------------------------------------------------------------
-- Migration RPC: claim an anonymous project (and its files/messages) for the
-- currently authenticated user. Runs as the caller (security invoker, the
-- default) so RLS still applies -- the caller must already be signed in,
-- and the WHERE clauses below only ever match rows that are still anonymous
-- (user_id is null) and match the exact session_id presented, so one user
-- can never claim another session's or another user's data.
-- ---------------------------------------------------------------------------
create or replace function public.claim_session_project(p_project_id uuid, p_session_id text)
returns public.projects
language plpgsql
security invoker
as $$
declare
  v_project public.projects;
begin
  if auth.uid() is null then
    raise exception 'Autenticação necessária para migrar projetos.';
  end if;

  select * into v_project
  from public.projects
  where id = p_project_id
    and session_id = p_session_id
    and user_id is null;

  if v_project.id is null then
    raise exception 'Projeto não encontrado ou já vinculado a uma conta.';
  end if;

  update public.projects
    set user_id = auth.uid(), session_id = null
    where id = p_project_id and session_id = p_session_id and user_id is null;

  update public.files
    set user_id = auth.uid(), session_id = null
    where project_id = p_project_id and session_id = p_session_id and user_id is null;

  update public.messages
    set user_id = auth.uid(), session_id = null
    where project_id = p_project_id and session_id = p_session_id and user_id is null;

  select * into v_project from public.projects where id = p_project_id;
  return v_project;
end;
$$;

-- ---------------------------------------------------------------------------
-- Storage bucket + policies for uploaded project files.
-- Object path convention: `${ownerKey}/${projectId}/${filename}`, where
-- ownerKey is the user's auth.uid() when logged in, or the session_id when
-- anonymous. This mirrors the projects/files ownership split above.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('project-files', 'project-files', false)
on conflict (id) do nothing;

create policy storage_select on storage.objects
  for select
  using (
    bucket_id = 'project-files'
    and (
      (auth.uid() is not null and (storage.foldername(name))[1] = auth.uid()::text)
      or auth.uid() is null
    )
  );

create policy storage_insert on storage.objects
  for insert
  with check (
    bucket_id = 'project-files'
    and (
      (auth.uid() is not null and (storage.foldername(name))[1] = auth.uid()::text)
      or auth.uid() is null
    )
  );

create policy storage_delete on storage.objects
  for delete
  using (
    bucket_id = 'project-files'
    and (
      (auth.uid() is not null and (storage.foldername(name))[1] = auth.uid()::text)
      or auth.uid() is null
    )
  );
