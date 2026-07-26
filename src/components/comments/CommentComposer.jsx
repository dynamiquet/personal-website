/*
  components/comments/CommentComposer.jsx
*/

import { useLayoutEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'

export default function CommentComposer({
  isSignedIn,
  onSubmit,
  placeholder = 'Write a comment…',
  submitLabel = 'Comment',
  autoFocus = false,
  onCancel,
  compact = false,
}) {
  const [text, setText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const textareaRef = useRef(null)
  const baseHeightRef = useRef(0)
  const location = useLocation()
  const returnTo = `${location.pathname}${location.search}${location.hash}`
  const rows = compact ? 2 : 3

  useLayoutEffect(() => {
    const el = textareaRef.current
    if (!el) return

    if (!baseHeightRef.current) {
      baseHeightRef.current = el.clientHeight
    }

    const base = baseHeightRef.current
    const max = base * 2
    el.style.height = 'auto'
    const next = Math.min(Math.max(el.scrollHeight, base), max)
    el.style.height = `${next}px`
    el.style.overflowY = el.scrollHeight > max ? 'auto' : 'hidden'
  }, [text, rows])

  async function handleSubmit(e) {
    e.preventDefault()
    const trimmed = text.trim()
    if (!trimmed || submitting) return
    setSubmitting(true)
    try {
      const result = onSubmit?.(trimmed)
      if (result?.ok !== false) setText('')
    } finally {
      setSubmitting(false)
    }
  }

  if (!isSignedIn) {
    return (
      <div
        className="rounded-xl border border-white/15 bg-white/5 p-3 font-ui text-[0.85rem] text-choc-soft"
        data-comment-ui=""
      >
        <p className="mb-2">Sign in to leave a comment.</p>
        <Link
          to="/login"
          state={{ from: returnTo }}
          className="inline-flex rounded-full bg-choc-accent px-3 py-1.5 text-[0.78rem]
                     font-semibold text-choc-deep hover:opacity-90 transition-opacity"
        >
          Sign in
        </Link>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2" data-comment-ui="">
      <textarea
        ref={textareaRef}
        value={text}
        onChange={e => setText(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        rows={rows}
        className="w-full resize-none overflow-hidden rounded-lg border border-white/20
                   bg-black/20 px-3 py-2 font-ui text-[0.85rem] text-choc-text outline-none
                   placeholder:text-choc-soft/50 focus:border-choc-accent/60"
      />
      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={!text.trim() || submitting}
          className="rounded-full bg-choc-accent px-3.5 py-1.5 font-ui text-[0.78rem]
                     font-semibold text-choc-deep disabled:opacity-40 hover:opacity-90
                     transition-opacity"
        >
          {submitLabel}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-full px-3 py-1.5 font-ui text-[0.78rem] text-choc-soft
                       hover:text-choc-text hover:bg-white/10 transition-colors"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  )
}
