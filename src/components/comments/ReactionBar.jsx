/*
  components/comments/ReactionBar.jsx

  Empty: bare heart outline — click loves, hover opens the emoji palette.
  With reactions: only accrued chips. Hover any chip for the palette;
  click toggles that emoji. No extra outline beside existing chips.
*/

import { useEffect, useRef, useState } from 'react'
import { REACTION_EMOJIS } from '../../data/discussions'

function HeartOutline({ className = '' }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  )
}

function HeartFilled({ className = '' }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={`text-red-500 ${className}`}
    >
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  )
}

function ReactionPicker({ items, onToggle }) {
  return (
    <div
      role="menu"
      aria-label="Pick a reaction"
      className="absolute bottom-full left-0 z-30 mb-2 grid w-max max-w-[13rem]
                 grid-cols-6 gap-1 rounded-xl border border-white/20
                 bg-choc-deep/95 p-2 shadow-xl backdrop-blur-sm"
    >
      {items.map(item => (
        <button
          key={item.id}
          type="button"
          role="menuitem"
          title={item.label}
          aria-label={item.label}
          aria-pressed={item.reactedByViewer}
          onClick={() => onToggle(item.id)}
          className={`rounded-lg px-1.5 py-1 text-[1rem] transition-colors
                      ${item.reactedByViewer
                        ? 'bg-choc-accent/25'
                        : 'hover:bg-white/10'
                      }`}
        >
          {item.id === 'loved' ? (
            item.reactedByViewer
              ? <HeartFilled className="mx-auto h-4 w-4" />
              : <HeartOutline className="mx-auto h-4 w-4 text-choc-soft" />
          ) : (
            <span aria-hidden="true">{item.emoji}</span>
          )}
        </button>
      ))}
    </div>
  )
}

export default function ReactionBar({
  summary,
  onToggle,
  size = 'md',
  className = '',
}) {
  const [pickerOpen, setPickerOpen] = useState(false)
  const rootRef = useRef(null)
  const closeTimerRef = useRef(null)

  const pad = size === 'sm' ? 'px-1.5 py-0.5 text-[0.7rem]' : 'px-2 py-1 text-[0.75rem]'
  const iconSize = size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4'
  const items = summary
    ?? REACTION_EMOJIS.map(r => ({ ...r, count: 0, reactedByViewer: false }))
  const active = items.filter(item => item.count > 0)

  function clearCloseTimer() {
    if (closeTimerRef.current != null) {
      window.clearTimeout(closeTimerRef.current)
      closeTimerRef.current = null
    }
  }

  function openPicker() {
    clearCloseTimer()
    setPickerOpen(true)
  }

  function scheduleClosePicker() {
    clearCloseTimer()
    closeTimerRef.current = window.setTimeout(() => {
      setPickerOpen(false)
      closeTimerRef.current = null
    }, 160)
  }

  useEffect(() => () => clearCloseTimer(), [])

  useEffect(() => {
    if (!pickerOpen) return undefined
    function onPointerDown(e) {
      if (!rootRef.current?.contains(e.target)) setPickerOpen(false)
    }
    function onKey(e) {
      if (e.key === 'Escape') setPickerOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [pickerOpen])

  function handleToggle(id) {
    onToggle?.(id)
    setPickerOpen(false)
  }

  return (
    <div
      ref={rootRef}
      className={`relative flex flex-wrap items-center gap-1.5 ${className}`}
      role="group"
      aria-label="Emoji reactions"
      data-comment-ui=""
      onMouseEnter={active.length > 0 ? openPicker : undefined}
      onMouseLeave={active.length > 0 ? scheduleClosePicker : undefined}
    >
      {active.length === 0 ? (
        <div
          className="relative"
          onMouseEnter={openPicker}
          onMouseLeave={scheduleClosePicker}
        >
          <button
            type="button"
            title="Love — hover for more reactions"
            aria-label="Add love reaction. Hover for more reactions."
            aria-expanded={pickerOpen}
            aria-pressed={false}
            onClick={() => handleToggle('loved')}
            className="inline-flex items-center justify-center p-0.5 text-choc-soft
                       hover:text-choc-text transition-colors"
          >
            <HeartOutline className={iconSize} />
          </button>
          {pickerOpen && (
            <ReactionPicker items={items} onToggle={handleToggle} />
          )}
        </div>
      ) : (
        <>
          {active.map(item => (
            <button
              key={item.id}
              type="button"
              title={`${item.label} — hover for more`}
              aria-label={`${item.label}, ${item.count}. Hover for more reactions.`}
              aria-pressed={item.reactedByViewer}
              aria-expanded={pickerOpen}
              onClick={() => handleToggle(item.id)}
              className={`inline-flex items-center gap-1 rounded-full border font-ui
                          transition-colors ${pad}
                          ${item.reactedByViewer
                            ? 'border-choc-accent/70 bg-choc-accent/20 text-choc-text'
                            : 'border-white/20 bg-white/5 text-choc-soft hover:bg-white/10 hover:text-choc-text'
                          }`}
            >
              {item.id === 'loved' ? (
                <HeartFilled className={iconSize} />
              ) : (
                <span aria-hidden="true">{item.emoji}</span>
              )}
              <span className="tabular-nums">{item.count}</span>
            </button>
          ))}
          {pickerOpen && (
            <ReactionPicker items={items} onToggle={handleToggle} />
          )}
        </>
      )}
    </div>
  )
}
