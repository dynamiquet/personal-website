/*
  utils/helpers.js — small, pure utility functions shared across components.
*/

import { stripMarkdown } from './markdown'

// Average silent reading speed: ~200 words/minute.
export function readingTime(text) {
  const plain = stripMarkdown(text ?? '')
  const words = plain.split(/\s+/).filter(Boolean).length
  const mins  = Math.max(1, Math.round(words / 200))
  return `${mins} min read`
}

/** First plain-text line of a body, suitable for card excerpts. */
export function excerptFromBody(body, maxLen = 110) {
  const plain = stripMarkdown(body ?? '')
  if (!plain) return ''
  return plain.length > maxLen ? plain.slice(0, maxLen) : plain
}

export function formatDateToday() {
  return formatPublishedAt(new Date())
}

/** Format a timestamptz / Date / ISO string for essay cards and headers. */
export function formatPublishedAt(value) {
  if (!value) return ''
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

/* Essay body fonts — maps to Tailwind font-* tokens already on the site. */
export const BODY_FONTS = [
  { id: 'hand',    label: 'Hand',   className: 'font-hand' },
  { id: 'display', label: 'Serif',  className: 'font-display' },
  { id: 'ui',      label: 'Clean',  className: 'font-ui' },
]

export const TEXT_SIZES = [
  { id: 'sm', label: 'S', className: 'text-[1.45rem] leading-[1.7]' },
  { id: 'md', label: 'M', className: 'text-[1.85rem] leading-[1.85]' },
  { id: 'lg', label: 'L', className: 'text-[2.15rem] leading-[1.9]' },
]

export function bodyFontClass(id) {
  return BODY_FONTS.find(f => f.id === id)?.className ?? 'font-hand'
}

export function textSizeClass(id) {
  return TEXT_SIZES.find(s => s.id === id)?.className ?? TEXT_SIZES[1].className
}

/** Defaults for new essays / older posts missing fields. */
export function essayDefaults(post = {}) {
  return {
    footnotes: Array.isArray(post.footnotes) ? post.footnotes : [],
    bodyFont:  post.bodyFont ?? 'hand',
    textSize:  post.textSize ?? 'md',
    align:     post.align    ?? 'left',
  }
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
