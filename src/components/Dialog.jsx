/*
  components/Dialog.jsx

  Shared chocolate-themed overlays for prompts and confirms —
  replaces window.prompt / window.confirm on the essay editor.
*/

import { useEffect, useId, useRef } from 'react'

export function Dialog({
  open,
  title,
  children,
  onClose,
  wide = false,
}) {
  const titleId = useId()
  const panelRef = useRef(null)

  useEffect(() => {
    if (!open) return undefined

    const prev = document.activeElement
    const onKey = e => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose?.()
      }
    }

    document.addEventListener('keydown', onKey)
    requestAnimationFrame(() => {
      const focusable = panelRef.current?.querySelector(
        'input, textarea, button:not([disabled])',
      )
      focusable?.focus()
      if (focusable?.select) focusable.select()
    })

    return () => {
      document.removeEventListener('keydown', onKey)
      if (prev instanceof HTMLElement) prev.focus()
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center px-4"
      role="presentation"
    >
      <button
        type="button"
        aria-label="Close dialog"
        className="absolute inset-0 bg-choc-deep/70 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`relative w-full ${wide ? 'max-w-lg' : 'max-w-md'}
                    rounded-2xl border border-white/15
                    bg-gradient-to-b from-[#4a2f20] to-[#2c1a10]
                    shadow-[0_24px_60px_rgba(0,0,0,0.45)]
                    text-choc-text p-6`}
      >
        <h2
          id={titleId}
          className="font-display text-[1.35rem] font-medium mb-4 leading-snug"
        >
          {title}
        </h2>
        {children}
      </div>
    </div>
  )
}

export function PromptDialog({
  open,
  title,
  label,
  defaultValue = '',
  placeholder = '',
  confirmLabel = 'Add',
  multiline = false,
  onConfirm,
  onCancel,
}) {
  const inputRef = useRef(null)

  function submit(e) {
    e?.preventDefault()
    const raw = inputRef.current?.value ?? ''
    const value = raw.trim()
    if (!value || value === 'https://') return
    onConfirm(value)
  }

  return (
    <Dialog open={open} title={title} onClose={onCancel} wide={multiline}>
      <form key={open ? 'open' : 'closed'} onSubmit={submit} className="space-y-4">
        {label && (
          <label className="block font-ui text-[0.72rem] uppercase
                            tracking-[0.12em] text-choc-soft">
            {label}
          </label>
        )}
        {multiline ? (
          <textarea
            ref={inputRef}
            defaultValue={defaultValue}
            placeholder={placeholder}
            rows={4}
            className="w-full bg-white/5 border border-white/15 rounded-xl
                       px-3.5 py-3 text-choc-text font-ui text-[0.95rem]
                       outline-none focus:border-choc-accent/60
                       placeholder:text-choc-soft/40 resize-y"
          />
        ) : (
          <input
            ref={inputRef}
            type="text"
            defaultValue={defaultValue}
            placeholder={placeholder}
            className="w-full bg-white/5 border border-white/15 rounded-xl
                       px-3.5 py-2.5 text-choc-text font-ui text-[0.95rem]
                       outline-none focus:border-choc-accent/60
                       placeholder:text-choc-soft/40"
          />
        )}
        <div className="flex justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onCancel}
            className="font-ui text-[0.8rem] font-semibold px-4 py-2 rounded-full
                       bg-white/5 text-choc-soft border border-white/20
                       hover:text-choc-text hover:bg-white/10 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="font-ui text-[0.8rem] font-semibold px-4 py-2 rounded-full
                       bg-choc-accent text-choc-deep border-choc-accent
                       hover:opacity-90 transition-opacity"
          >
            {confirmLabel}
          </button>
        </div>
      </form>
    </Dialog>
  )
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  danger = false,
  onConfirm,
  onCancel,
}) {
  return (
    <Dialog open={open} title={title} onClose={onCancel}>
      {message && (
        <p className="font-ui text-[0.95rem] text-choc-soft leading-relaxed mb-6">
          {message}
        </p>
      )}
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="font-ui text-[0.8rem] font-semibold px-4 py-2 rounded-full
                     bg-white/5 text-choc-soft border border-white/20
                     hover:text-choc-text hover:bg-white/10 transition-colors"
        >
          {cancelLabel}
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className={`font-ui text-[0.8rem] font-semibold px-4 py-2 rounded-full
                      border transition-colors
                      ${danger
                        ? 'text-[#e8a98c] border-[#e8a98c]/45 bg-[#e8a98c]/10 hover:bg-[#e8a98c]/20'
                        : 'bg-choc-accent text-choc-deep border-choc-accent hover:opacity-90'
                      }`}
        >
          {confirmLabel}
        </button>
      </div>
    </Dialog>
  )
}
