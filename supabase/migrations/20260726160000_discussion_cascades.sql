-- Cascade cleanup for discussions.
--
-- reactions.target_id is polymorphic (comment or inline thread), so no foreign
-- key cascade covers it, and RLS only lets a viewer delete their own reactions.
-- That left orphan reactions whenever the site author removed someone else's
-- comment. These security definer triggers do the sweep server-side.
--
-- Also drops an inline thread once its last comment and reaction are gone, so
-- the database matches what the client store already does.

-- ---------------------------------------------------------------------------
-- Reactions on a deleted comment
-- ---------------------------------------------------------------------------

create or replace function public.delete_comment_reactions()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.reactions
  where target_type = 'comment'
    and target_id = old.id;
  return old;
end;
$$;

create trigger comments_delete_reactions
  before delete on public.comments
  for each row execute function public.delete_comment_reactions();

-- ---------------------------------------------------------------------------
-- Reactions on a deleted inline thread
-- ---------------------------------------------------------------------------

create or replace function public.delete_thread_reactions()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.reactions
  where target_type = 'excerpt'
    and target_id = old.id;
  return old;
end;
$$;

create trigger inline_threads_delete_reactions
  before delete on public.inline_threads
  for each row execute function public.delete_thread_reactions();

-- ---------------------------------------------------------------------------
-- Drop an inline thread once nothing references it
-- ---------------------------------------------------------------------------

create or replace function public.cleanup_empty_inline_thread()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.thread_id is null then
    return null;
  end if;

  if not exists (
    select 1 from public.comments where thread_id = old.thread_id
  ) and not exists (
    select 1 from public.reactions
    where target_type = 'excerpt' and target_id = old.thread_id
  ) then
    delete from public.inline_threads where id = old.thread_id;
  end if;

  return null;
end;
$$;

create trigger comments_cleanup_empty_thread
  after delete on public.comments
  for each row execute function public.cleanup_empty_inline_thread();
