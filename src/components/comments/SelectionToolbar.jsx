/*
  components/comments/SelectionToolbar.jsx

  Floating toolbar near a text selection: quick emoji reactions + add comment.
*/

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { REACTION_EMOJIS } from '../../data/discussions'
import CommentComposer from './CommentComposer'

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n))
}

export default function SelectionToolbar({
  anchor,
  rangeRect,
  isSignedIn,
  onReact,
  onComment,
  onClose,
}) {
  const toolbarRef = useRef(null)
  const composingRef = useRef(false)
  const [pos, setPos] = useState({ top: 0, left: 0 })
  const [composing, setComposing] = useState(false)
  const [showAllEmojis, setShowAllEmojis] = useState(false)
  const location = useLocation()
  const returnTo = `${location.pathname}${location.search}${location.hash}`

  const QUICK_COUNT = 4
  const visibleEmojis = showAllEmojis
    ? REACTION_EMOJIS
    : REACTION_EMOJIS.slice(0, QUICK_COUNT)

  composingRef.current = composing

  useLayoutEffect(() => {
    if (!rangeRect || !toolbarRef.current) return
    const el = toolbarRef.current
    const tw = el.offsetWidth
    const th = el.offsetHeight
    const gap = 10
    let top = rangeRect.top - th - gap
    if (top < 8) {
      top = rangeRect.bottom + gap
    }
    const left = clamp(
      rangeRect.left + rangeRect.width / 2 - tw / 2,
      8,
      window.innerWidth - tw - 8,
    )
    setPos({ top, left })
  }, [rangeRect, composing, anchor])

  useEffect(() => {
    function onKey(e) {
      if (e.key !== 'Escape') return
      // Don't dismiss while typing — Escape backs out of compose first.
      if (composingRef.current) {
        setComposing(false)
        return
      }
      onClose?.()
    }

    function onScrollOrResize(e) {
      // Pasting into the composer can scroll the textarea; ignore those.
      if (composingRef.current) return
      const target = e?.target
      if (target && typeof target.closest === 'function' && target.closest('[data-comment-ui]')) {
        return
      }
      onClose?.()
    }

    window.addEventListener('keydown', onKey)
    window.addEventListener('scroll', onScrollOrResize, true)
    window.addEventListener('resize', onScrollOrResize)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('scroll', onScrollOrResize, true)
      window.removeEventListener('resize', onScrollOrResize)
    }
  }, [onClose])

  if (!anchor || !rangeRect) return null

  return (
    <div
      ref={toolbarRef}
      data-comment-ui=""
      role="toolbar"
      aria-label="Selection actions"
      className="z-[60] rounded-2xl border border-white/20 bg-choc-deep/95
                 shadow-xl backdrop-blur-sm p-2 max-w-[min(92vw,22rem)]"
      style={{ top: pos.top, left: pos.left, position: 'fixed' }}
      onMouseDown={e => {
        // Keep the text selection while clicking toolbar controls, but allow
        // inputs/textareas to take focus when composing a comment.
        if (e.target.closest('textarea, input')) return
        e.preventDefault()
      }}
    >
      {!composing ? (
        <div className="flex flex-wrap items-center gap-1">
          {isSignedIn ? (
            <>
              {visibleEmojis.map(item => (
                <button
                  key={item.id}
                  type="button"
                  title={item.label}
                  aria-label={item.label}
                  onClick={() => onReact?.(item.id)}
                  className="rounded-full px-2 py-1.5 font-ui text-[0.85rem]
                             hover:bg-white/10 transition-colors"
                >
                  <span aria-hidden="true">{item.emoji}</span>
                </button>
              ))}
              <button
                type="button"
                aria-label={showAllEmojis ? 'Show fewer reactions' : 'Show more reactions'}
                aria-expanded={showAllEmojis}
                onClick={() => setShowAllEmojis(v => !v)}
                className="rounded-full px-2 py-1.5 font-ui text-[0.75rem] font-semibold
                           text-choc-soft hover:bg-white/10 hover:text-choc-text
                           transition-colors"
              >
                {showAllEmojis ? '−' : `+${REACTION_EMOJIS.length - QUICK_COUNT}`}
              </button>
              <span className="mx-0.5 h-5 w-px bg-white/20" aria-hidden="true" />
              <button
                type="button"
                onClick={() => setComposing(true)}
                className="rounded-full px-2.5 py-1.5 font-ui text-[0.75rem] font-semibold
                           text-choc-accent hover:bg-white/10 transition-colors"
              >
                Add comment
              </button>
            </>
          ) : (
            <Link
              to="/login"
              state={{ from: returnTo }}
              className="rounded-full px-2.5 py-1.5 font-ui text-[0.75rem] font-semibold
                         text-choc-accent hover:bg-white/10 transition-colors"
            >
              Sign in to react or comment
            </Link>
          )}
        </div>
      ) : (
        <div className="w-[min(88vw,20rem)]">
          <p className="mb-2 font-ui text-[0.72rem] text-choc-soft line-clamp-2">
            “{anchor.quote}”
          </p>
          <CommentComposer
            isSignedIn={isSignedIn}
            autoFocus
            compact
            submitLabel="Post"
            placeholder="Comment on this excerpt…"
            onCancel={() => setComposing(false)}
            onSubmit={(text) => {
              const result = onComment?.(text)
              if (result?.ok !== false) onClose?.()
              return result
            }}
          />
        </div>
      )}
    </div>
  )
}
