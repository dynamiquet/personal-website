# Dynamique Twizere — personal site

A React + Tailwind personal site. Three pages, real URL routing, front-end
editable blog posts. No backend yet — posts live in localStorage.

## Stack

| Layer       | Choice                          |
|-------------|---------------------------------|
| Framework   | React 18                        |
| Routing     | React Router v6 (real URLs)     |
| Styling     | Tailwind CSS v3                 |
| Build tool  | Vite 5                          |
| Data        | localStorage (swap later — see below) |

## Getting started

```bash
npm install
npm run dev
# open http://localhost:5173
```

Production build:
```bash
npm run build       # outputs to dist/
npm run preview     # preview the build locally
```

## Deploying

**Netlify (easiest):** drag the `dist/` folder (after `npm run build`) to
[app.netlify.com/drop](https://app.netlify.com/drop).

**Vercel:** `npx vercel` from the project root.

**GitHub Pages:** push to a repo, set the build command to `npm run build`
and the publish directory to `dist`. Also add a `public/_redirects` file
containing `/* /index.html 200` so React Router's client-side routing works
after a hard refresh.

## Project structure

```
src/
├── main.jsx                entry point
├── App.jsx                 router + PostsProvider
├── index.css               Tailwind directives + the two global rules that
│                           can't live in Tailwind (card hover transform,
│                           landing fade-in animation)
├── components/
│   └── Nav.jsx             fixed nav bar + hamburger + side drawer
├── pages/
│   ├── Landing.jsx         / — full-screen landing, "write" link
│   ├── BlogList.jsx        /writings — scattered card grid, + New post
│   └── BlogPost.jsx        /writings/:id — read mode + edit mode
├── context/
│   └── PostsContext.jsx    React context — posts state available site-wide
├── data/
│   └── seed.js             localStorage storage layer (only file to change
│                           when moving to a real backend)
└── utils/
    └── helpers.js          readingTime, cardStyle scatter, formatDateToday
```

## Adding a new page

1. Create `src/pages/YourPage.jsx`
2. Add `<Route path="/your-path" element={<YourPage />} />` in `App.jsx`
3. Add a link inside `<aside>` in `Nav.jsx`

That's it — the router, nav, and context all handle the rest automatically.

## Moving to a real backend

`src/data/seed.js` is the **only** file that knows about localStorage.
It exports two functions: `loadPosts()` and `savePosts(posts)`.
When you're ready for a real backend (Supabase, PocketBase, a simple
Express API, anything), swap those two functions for `fetch()` calls.
`PostsContext.jsx` calls them, and every page calls the context — nothing
else needs to change.

## Adding auth to edit mode

`BlogPost.jsx` currently lets anyone edit. Before deploying publicly:
- Gate the `isEditing` state (or the Edit button) behind a login check.
- The simplest pattern: store a `isLoggedIn` boolean in context, show the
  Edit button only when true, redirect to a `/login` route otherwise.

## Design tokens

All design values (colors, fonts, gradients) live in `tailwind.config.js`
under `theme.extend`. Change them there — every component that uses a
token (e.g. `text-ink`, `bg-grad-landing`, `font-hand`) updates instantly.
