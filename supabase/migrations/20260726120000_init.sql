-- Initial schema: profiles, posts, discussions (threads/comments/reactions)
-- + RLS. Apply via Supabase SQL editor or `supabase db push`.

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- profiles (1:1 with auth.users)
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null,
  avatar_url text,
  role text not null default 'reader'
    check (role in ('reader', 'author')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Clients may update display_name / avatar_url, never role.
-- SQL editor / service_role (not anon|authenticated) may still change role.
create or replace function public.protect_profile_role()
returns trigger
language plpgsql
as $$
begin
  if new.role is distinct from old.role then
    if coalesce(auth.role(), '') in ('anon', 'authenticated') then
      raise exception 'profiles.role can only be changed by a service role / SQL editor';
    end if;
  end if;
  return new;
end;
$$;

create trigger profiles_protect_role
  before update on public.profiles
  for each row execute function public.protect_profile_role();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, avatar_url, role)
  values (
    new.id,
    coalesce(
      nullif(trim(new.raw_user_meta_data->>'display_name'), ''),
      split_part(new.email, '@', 1),
      'Reader'
    ),
    nullif(trim(new.raw_user_meta_data->>'avatar_url'), ''),
    'reader'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- After profiles exists (SQL functions validate body at create time).
create or replace function public.is_author()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'author'
  );
$$;

-- ---------------------------------------------------------------------------
-- posts
-- ---------------------------------------------------------------------------

create table public.posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles (id) on delete restrict,
  title text not null,
  excerpt text not null default '',
  body text not null default '',
  published_at timestamptz not null default now(),
  body_font text not null default 'hand'
    check (body_font in ('hand', 'display', 'ui')),
  text_size text not null default 'md'
    check (text_size in ('sm', 'md', 'lg')),
  align text not null default 'left'
    check (align in ('left', 'center')),
  footnotes jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index posts_published_at_idx on public.posts (published_at desc);

create trigger posts_set_updated_at
  before update on public.posts
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- inline_threads
-- ---------------------------------------------------------------------------

create table public.inline_threads (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts (id) on delete cascade,
  anchor jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index inline_threads_post_id_idx on public.inline_threads (post_id);

create trigger inline_threads_set_updated_at
  before update on public.inline_threads
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- comments
-- ---------------------------------------------------------------------------

create table public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts (id) on delete cascade,
  thread_id uuid references public.inline_threads (id) on delete cascade,
  parent_id uuid references public.comments (id) on delete cascade,
  scope text not null check (scope in ('inline', 'article')),
  author_id uuid not null references public.profiles (id) on delete cascade,
  text text not null check (char_length(trim(text)) > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint comments_scope_thread_ck check (
    (scope = 'inline' and thread_id is not null)
    or (scope = 'article' and thread_id is null)
  )
);

create index comments_post_id_idx on public.comments (post_id);
create index comments_thread_id_idx on public.comments (thread_id);
create index comments_parent_id_idx on public.comments (parent_id);

create trigger comments_set_updated_at
  before update on public.comments
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- reactions (signed-in only; no guest viewers)
-- ---------------------------------------------------------------------------

create table public.reactions (
  id uuid primary key default gen_random_uuid(),
  target_type text not null check (target_type in ('excerpt', 'comment')),
  target_id uuid not null,
  emoji text not null check (emoji in (
    'insightful', 'pondering', 'loved', 'agree', 'funny', 'wow',
    'sad', 'fire', 'applause', 'grateful', 'hundred', 'eyes'
  )),
  viewer_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (target_type, target_id, emoji, viewer_id)
);

create index reactions_target_idx on public.reactions (target_type, target_id);
create index reactions_viewer_id_idx on public.reactions (viewer_id);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.posts enable row level security;
alter table public.inline_threads enable row level security;
alter table public.comments enable row level security;
alter table public.reactions enable row level security;

-- profiles
create policy "Profiles are publicly readable"
  on public.profiles for select
  using (true);

create policy "Users can update own profile"
  on public.profiles for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- posts
create policy "Posts are publicly readable"
  on public.posts for select
  using (true);

create policy "Authors can insert posts"
  on public.posts for insert
  to authenticated
  with check (public.is_author() and author_id = auth.uid());

create policy "Authors can update posts"
  on public.posts for update
  to authenticated
  using (public.is_author())
  with check (public.is_author() and author_id = auth.uid());

create policy "Authors can delete posts"
  on public.posts for delete
  to authenticated
  using (public.is_author());

-- inline_threads
create policy "Inline threads are publicly readable"
  on public.inline_threads for select
  using (true);

create policy "Signed-in users can create inline threads"
  on public.inline_threads for insert
  to authenticated
  with check (auth.uid() is not null);

create policy "Authors can delete inline threads"
  on public.inline_threads for delete
  to authenticated
  using (public.is_author());

-- comments
create policy "Comments are publicly readable"
  on public.comments for select
  using (true);

create policy "Signed-in users can insert own comments"
  on public.comments for insert
  to authenticated
  with check (author_id = auth.uid());

create policy "Users can update own comment text"
  on public.comments for update
  to authenticated
  using (author_id = auth.uid())
  with check (author_id = auth.uid());

create policy "Users or author can delete comments"
  on public.comments for delete
  to authenticated
  using (author_id = auth.uid() or public.is_author());

-- reactions
create policy "Reactions are publicly readable"
  on public.reactions for select
  using (true);

create policy "Signed-in users can insert own reactions"
  on public.reactions for insert
  to authenticated
  with check (viewer_id = auth.uid());

create policy "Users can delete own reactions"
  on public.reactions for delete
  to authenticated
  using (viewer_id = auth.uid());
