/*
  components/MarkdownToolbar.jsx

  Inserts Markdown around the current textarea selection:
  bold, italic, strikethrough, heading, link, image, footnote,
  quote, list, and clear formatting.

  Link / image / footnote use styled dialogs (not window.prompt).
*/

import { useEffect, useState } from 'react'
import { PromptDialog } from './Dialog'
import {
  markdownActions,
  modKeyLabel,
  nextFootnoteId,
} from '../utils/markdown'

function MdBtn({ onClick, children, title }) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className="font-ui text-[0.72rem] font-semibold min-w-[1.85rem] px-2 py-1.5
                 rounded-md border border-white/20 bg-white/5 text-choc-soft
                 hover:text-choc-text hover:bg-white/10 transition-colors"
    >
      {children}
    </button>
  )
}

export default function MarkdownToolbar({
  textareaRef,
  onChange,
  footnotes = [],
  onFootnotesChange,
  promptApiRef,
}) {
  const mod = modKeyLabel()
  const [prompt, setPrompt] = useState(null) // 'link' | 'image' | 'footnote' | null

  useEffect(() => {
    if (!promptApiRef) return undefined
    promptApiRef.current = {
      openLink: () => setPrompt('link'),
      openImage: () => setPrompt('image'),
      openFootnote: () => setPrompt('footnote'),
    }
    return () => {
      promptApiRef.current = {}
    }
  }, [promptApiRef])

  function getActions() {
    const el = textareaRef.current
    if (!el) return null
    return markdownActions(el, onChange, {
      onRequestLink:     () => setPrompt('link'),
      onRequestImage:    () => setPrompt('image'),
      onRequestFootnote: () => setPrompt('footnote'),
    })
  }

  function run(name) {
    getActions()?.[name]?.()
  }

  function closePrompt() {
    setPrompt(null)
    requestAnimationFrame(() => textareaRef.current?.focus())
  }

  function handlePromptConfirm(value) {
    const actions = getActions()
    if (!actions) {
      setPrompt(null)
      return
    }

    if (prompt === 'link') {
      actions.applyLink(value)
    } else if (prompt === 'image') {
      actions.applyImage(value)
    } else if (prompt === 'footnote') {
      const id = nextFootnoteId(footnotes)
      actions.applyFootnote(id)
      onFootnotesChange?.([...footnotes, { id, text: value }])
    }

    setPrompt(null)
  }

  return (
    <>
      <div
        role="toolbar"
        aria-label="Markdown formatting"
        className="flex flex-wrap items-center gap-1.5 mb-2"
      >
        <span className="font-ui text-[0.65rem] uppercase tracking-[0.12em]
                         text-choc-soft/80 mr-0.5">
          Format
        </span>

        <MdBtn title={`Bold (${mod}+B)`} onClick={() => run('bold')}>
          <span className="font-bold">B</span>
        </MdBtn>
        <MdBtn title={`Italic (${mod}+I)`} onClick={() => run('italic')}>
          <span className="italic">I</span>
        </MdBtn>
        <MdBtn title={`Strikethrough (${mod}+Shift+X)`} onClick={() => run('strike')}>
          <span className="line-through">S</span>
        </MdBtn>
        <MdBtn title="Heading" onClick={() => run('heading')}>
          H2
        </MdBtn>
        <MdBtn title={`Link (${mod}+K)`} onClick={() => run('link')}>
          Link
        </MdBtn>
        <MdBtn title="Image from URL" onClick={() => run('image')}>
          Image
        </MdBtn>
        <MdBtn title="Insert footnote" onClick={() => run('footnote')}>
          Note¹
        </MdBtn>
        <MdBtn title="Quote" onClick={() => run('quote')}>
          Quote
        </MdBtn>
        <MdBtn title="Bullet list" onClick={() => run('list')}>
          List
        </MdBtn>
        <MdBtn title={`Clear formatting (${mod}+\\)`} onClick={() => run('clear')}>
          Clear
        </MdBtn>

        <span className="ml-auto font-ui text-[0.65rem] text-choc-soft/60 hidden sm:inline tabular-nums">
          {mod}+B · {mod}+I · {mod}+K · {mod}+⇧+X · {mod}+\ · {mod}+Z
        </span>
      </div>

      <PromptDialog
        open={prompt === 'link'}
        title="Add link"
        label="URL"
        defaultValue="https://"
        placeholder="https://example.com"
        confirmLabel="Add link"
        onConfirm={handlePromptConfirm}
        onCancel={closePrompt}
      />
      <PromptDialog
        open={prompt === 'image'}
        title="Add image"
        label="Image URL"
        defaultValue="https://"
        placeholder="https://example.com/photo.jpg"
        confirmLabel="Add image"
        onConfirm={handlePromptConfirm}
        onCancel={closePrompt}
      />
      <PromptDialog
        open={prompt === 'footnote'}
        title="Add footnote"
        label="Reference"
        placeholder="Citation, source, or aside…"
        confirmLabel="Insert"
        multiline
        onConfirm={handlePromptConfirm}
        onCancel={closePrompt}
      />
    </>
  )
}
