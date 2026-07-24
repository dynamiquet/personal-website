/*
  utils/helpers.js — small, pure utility functions shared across components.
*/

// Average silent reading speed: ~200 words/minute.
export function readingTime(text) {
  const words = text.trim().split(/\s+/).filter(Boolean).length
  const mins  = Math.max(1, Math.round(words / 200))
  return `${mins} min read`
}

export function formatDateToday() {
  return new Date().toLocaleDateString('en-US', {
    month: 'long',
    day:   'numeric',
    year:  'numeric',
  })
}

/*
  Scatter layout data for blog cards.
  Using a fixed lookup table (not Math.random()) so the layout is stable
  across re-renders but still looks hand-placed.
  Applied via inline style --lift / --tilt CSS vars so the :hover rule in
  index.css can read them.
*/
const SCATTER = [
  { lift: -13, tilt: -1.5 },
  { lift:  27, tilt:  1.0 },
  { lift:  -4, tilt:  2.0 },
  { lift:  17, tilt: -0.8 },
  { lift:   3, tilt:  0.4 },
  { lift: -19, tilt:  1.7 },
  { lift:   9, tilt: -1.9 },
  { lift:  24, tilt:  0.5 },
  { lift:  -7, tilt: -0.3 },
  { lift:  12, tilt:  1.3 },
]

export function cardStyle(index) {
  const { lift, tilt } = SCATTER[index % SCATTER.length]
  return {
    '--lift': `${lift}px`,
    '--tilt': `${tilt}deg`,
    transform: `translateY(${lift}px) rotate(${tilt}deg)`,
  }
}
