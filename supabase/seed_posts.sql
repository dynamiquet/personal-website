-- One-shot seed of the three starter essays into public.posts.
-- Requires at least one profile with role = 'author'.
-- Safe to re-run: skips insert when that author already has posts.
--
-- Apply in the Supabase SQL editor after auth + schema are set up.

insert into public.posts (
  author_id,
  title,
  excerpt,
  body,
  published_at,
  footnotes
)
select
  a.id,
  v.title,
  v.excerpt,
  v.body,
  v.published_at,
  v.footnotes::jsonb
from (
  select id
  from public.profiles
  where role = 'author'
  order by created_at asc
  limit 1
) as a
cross join (
  values
    (
      'On starting things badly',
      'Most of what I make begins as something I am slightly embarrassed by.',
      $body1$Most of what I make begins as something I am slightly embarrassed by.

I used to think that meant I was doing it wrong. Now I think it's closer to evidence that I started at all. The embarrassing draft is the one that exists — the polished version only ever lives in my head, where it costs nothing and proves nothing.

## Starting anyway

So I've stopped waiting for the good version to start. I start with the **bad one**, and I let it be *seen*.

> The draft that exists beats the masterpiece that doesn't.

If you want a place to begin, begin [here](/writings) — awkwardly is fine.[^1]$body1$,
      '2026-06-02T12:00:00.000Z'::timestamptz,
      '[{"id":1,"text":"A nod to the idea that public drafts teach more than private perfection."}]'
    ),
    (
      'A short note on quiet rooms',
      'I write best in rooms that don''t ask anything of me.',
      $body2$I write best in rooms that don't ask anything of me.

Not silent rooms necessarily — just rooms with no opinion about what I should be doing in them. A kitchen at 11pm. A train. Anywhere that isn't a desk that's seen too many unfinished things.$body2$,
      '2026-05-21T12:00:00.000Z'::timestamptz,
      '[]'
    ),
    (
      'Building in public, slowly',
      'This site is a block I will keep building on. That is the entire plan.',
      $body3$This site is a block I will keep building on. That is the entire plan.

No roadmap, no launch date for some imagined final version. Just a place that grows the way I do — a little awkwardly, mostly in the right direction.$body3$,
      '2026-05-09T12:00:00.000Z'::timestamptz,
      '[]'
    )
) as v(title, excerpt, body, published_at, footnotes)
where not exists (
  select 1
  from public.posts p
  where p.author_id = a.id
);
