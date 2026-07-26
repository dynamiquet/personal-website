/*
  data/seed.js — the storage layer.

  Everything that touches localStorage lives here and ONLY here.
  When you move to a real backend, swap loadPosts / savePosts for
  fetch() calls to your API — nothing else in the project needs to change.
*/

const STORAGE_KEY = 'dt_posts'

export const SEED_POSTS = [
  {
    id: 'p1',
    title: 'On starting things badly',
    excerpt: 'Most of what I make begins as something I am slightly embarrassed by.',
    date: 'June 2, 2026',
    body: `Most of what I make begins as something I am slightly embarrassed by.

I used to think that meant I was doing it wrong. Now I think it's closer to evidence that I started at all. The embarrassing draft is the one that exists — the polished version only ever lives in my head, where it costs nothing and proves nothing.

## Starting anyway

So I've stopped waiting for the good version to start. I start with the **bad one**, and I let it be *seen*.

> The draft that exists beats the masterpiece that doesn't.

If you want a place to begin, begin [here](/writings) — awkwardly is fine.[^1]`,
    footnotes: [
      {
        id: 1,
        text: 'A nod to the idea that public drafts teach more than private perfection.',
      },
    ],
  },
  {
    id: 'p2',
    title: 'A short note on quiet rooms',
    excerpt: "I write best in rooms that don't ask anything of me.",
    date: 'May 21, 2026',
    body: `I write best in rooms that don't ask anything of me.

Not silent rooms necessarily — just rooms with no opinion about what I should be doing in them. A kitchen at 11pm. A train. Anywhere that isn't a desk that's seen too many unfinished things.`,
  },
  {
    id: 'p3',
    title: 'Building in public, slowly',
    excerpt: 'This site is a block I will keep building on. That is the entire plan.',
    date: 'May 9, 2026',
    body: `This site is a block I will keep building on. That is the entire plan.

No roadmap, no launch date for some imagined final version. Just a place that grows the way I do — a little awkwardly, mostly in the right direction.`,
  },
]

export function loadPosts() {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED_POSTS))
    return [...SEED_POSTS]
  }
  try {
    return JSON.parse(raw)
  } catch {
    return [...SEED_POSTS]
  }
}

export function savePosts(posts) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(posts))
}
