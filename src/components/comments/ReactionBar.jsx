/*
  components/comments/ReactionBar.jsx

  Compact by default: only reactions that exist show as chips.
  The full emoji palette lives behind a small + trigger.
*/

import { useEffect, useRef, useState } from 'react'
import { REACTION_EMOJIS } from '../../data/discussions'

export default function ReactionBar({
  summary,
  onToggle,
  size = 'md',
  className = '',
}) {
  const [pickerOpen, setPickerOpen] = useState(false)
  const rootRef = useRef(null)

  const pad = size === 'sm' ? 'px-1.5 py-0.5 text-[0.7rem]' : 'px-2 py-1 text-[0.75rem]'
  const items = summary
    ?? REACTION_EMOJIS.map(r => ({ ...r, count: 0, reactedByViewer: false }))
  const active = items.filter(item => item.count > 0)

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
    >
      {active.map(item => (
        <button
          key={item.id}
          type="button"
          title={item.label}
          aria-label={`${item.label}, ${item.count}`}
          aria-pressed={item.reactedByViewer}
          onClick={() => handleToggle(item.id)}
          className={`inline-flex items-center gap-1 rounded-full border font-ui
                      transition-colors ${pad}
                      ${item.reactedByViewer
                        ? 'border-choc-accent/70 bg-choc-accent/20 text-choc-text'
                        : 'border-white/20 bg-white/5 text-choc-soft hover:bg-white/10 hover:text-choc-text'
                      }`}
        >
          <span aria-hidden="true">{item.emoji}</span>
          <span className="tabular-nums">{item.count}</span>
        </button>
      ))}

      <button
        type="button"
        title="Add reaction"
        aria-label="Add reaction"
        aria-expanded={pickerOpen}
        onClick={() => setPickerOpen(v => !v)}
        className={`inline-flex items-center justify-center rounded-full border border-dashed
                    border-white/25 bg-transparent font-ui font-semibold text-choc-soft
                    hover:bg-white/10 hover:text-choc-text hover:border-white/40
                    transition-colors ${pad}`}
      >
        <span aria-hidden="true">+</span>
      </button>

      {pickerOpen && (
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
              onClick={() => handleToggle(item.id)}
              className={`rounded-lg px-1.5 py-1 text-[1rem] transition-colors
                          ${item.reactedByViewer
                            ? 'bg-choc-accent/25'
                            : 'hover:bg-white/10'
                          }`}
            >
              <span aria-hidden="true">{item.emoji}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
