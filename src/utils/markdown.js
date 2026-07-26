/*
  utils/markdown.js — helpers for essay Markdown editing and excerpts.
*/

/** Strip common Markdown syntax so excerpts / word counts stay readable. */
export function stripMarkdown(text = '') {
  return text
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`[^`]*`/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/\[\^[^\]]*\]/g, ' ')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^>\s?/gm, '')
    .replace(/^[-*+]\s+/gm, '')
    .replace(/^\d+\.\s+/gm, '')
    .replace(/(\*\*|__)(.*?)\1/g, '$2')
    .replace(/(\*|_)(.*?)\1/g, '$2')
    .replace(/~~(.*?)~~/g, '$1')
    .replace(/\|/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Toggle-wrap the current textarea selection (or insert placeholder text).
 * Running again on the same span removes the markers.
 */
export function toggleWrapSelection(textarea, before, after = before, placeholder = 'text') {
  const start = textarea.selectionStart
  const end = textarea.selectionEnd
  const value = textarea.value
  const selected = value.slice(start, end)

  if (
    selected.startsWith(before)
    && selected.endsWith(after)
    && selected.length >= before.length + after.length
  ) {
    const inner = selected.slice(before.length, selected.length - after.length)
    const next = value.slice(0, start) + inner + value.slice(end)
    return {
      next,
      selectionStart: start,
      selectionEnd: start + inner.length,
    }
  }

  if (
    value.slice(start - before.length, start) === before
    && value.slice(end, end + after.length) === after
  ) {
    const outerStart = start - before.length
    const next = value.slice(0, outerStart) + selected + value.slice(end + after.length)
    return {
      next,
      selectionStart: outerStart,
      selectionEnd: outerStart + selected.length,
    }
  }

  const inner = selected || placeholder
  const next = value.slice(0, start) + before + inner + after + value.slice(end)

  return {
    next,
    selectionStart: start + before.length,
    selectionEnd: start + before.length + inner.length,
  }
}

/** Toggle a block prefix on each selected line (headings, lists, quotes). */
export function toggleLinePrefix(textarea, prefix) {
  const start = textarea.selectionStart
  const end = textarea.selectionEnd
  const value = textarea.value

  const lineStart = value.lastIndexOf('\n', start - 1) + 1
  const lineEnd = (() => {
    const i = value.indexOf('\n', end)
    return i === -1 ? value.length : i
  })()

  const block = value.slice(lineStart, lineEnd)
  const sourceLines = block.split('\n')
  const removePrefix = sourceLines
    .filter(line => line.trim())
    .every(line => line.startsWith(prefix))
  const lines = sourceLines.map(line => {
    if (!line.trim()) return line
    if (removePrefix) return line.slice(prefix.length)
    const bare = line.replace(/^#{1,6}\s+/, '').replace(/^>\s?/, '').replace(/^[-*+]\s+/, '')
    return `${prefix}${bare}`
  })
  const replaced = lines.join('\n')
  const next = value.slice(0, lineStart) + replaced + value.slice(lineEnd)

  return {
    next,
    selectionStart: lineStart,
    selectionEnd: lineStart + replaced.length,
  }
}

export function applyToTextarea(textarea, result, onChange) {
  onChange(result.next, { source: 'format' })
  requestAnimationFrame(() => {
    textarea.focus()
    textarea.setSelectionRange(result.selectionStart, result.selectionEnd)
  })
}

/** True on macOS / iOS — used for shortcut labels (⌘ vs Ctrl). */
export function isApplePlatform() {
  if (typeof navigator === 'undefined') return false
  return /Mac|iPhone|iPad|iPod/i.test(navigator.platform || navigator.userAgent || '')
}

export function modKeyLabel() {
  return isApplePlatform() ? '⌘' : 'Ctrl'
}

/** If the selection is (or sits inside) a Markdown link, unwrap it. */
export function tryRemoveLink(textarea) {
  const start = textarea.selectionStart
  const end = textarea.selectionEnd
  const value = textarea.value
  const selected = value.slice(start, end)
  const fullLink = selected.match(/^\[([\s\S]*)\]\(([^)]*)\)$/)

  if (fullLink) {
    const inner = fullLink[1]
    return {
      next: value.slice(0, start) + inner + value.slice(end),
      selectionStart: start,
      selectionEnd: start + inner.length,
    }
  }

  const suffix = value.slice(end).match(/^\]\(([^)]*)\)/)
  if (value[start - 1] === '[' && suffix) {
    const outerStart = start - 1
    return {
      next: value.slice(0, outerStart) + selected + value.slice(end + suffix[0].length),
      selectionStart: outerStart,
      selectionEnd: outerStart + selected.length,
    }
  }

  return null
}

export function insertLink(textarea, url) {
  return toggleWrapSelection(textarea, '[', `](${url})`, 'link text')
}

export function insertImage(textarea, url) {
  return toggleWrapSelection(textarea, '![', `](${url})`, 'description')
}

export function nextFootnoteId(footnotes = []) {
  const max = footnotes.reduce((m, f) => Math.max(m, Number(f.id) || 0), 0)
  return max + 1
}

/** Insert a [^n] marker at the caret. */
export function insertFootnoteRef(textarea, id) {
  const start = textarea.selectionStart
  const end = textarea.selectionEnd
  const value = textarea.value
  const marker = `[^${id}]`
  const next = value.slice(0, start) + marker + value.slice(end)
  const caret = start + marker.length
  return {
    next,
    selectionStart: caret,
    selectionEnd: caret,
  }
}

/** Append GFM footnote definitions for rendering (not stored in body). */
export function withFootnoteDefs(body = '', footnotes = []) {
  const defs = (footnotes || [])
    .filter(f => f && String(f.text ?? '').trim())
    .map(f => `[^${f.id}]: ${String(f.text).trim()}`)
  if (!defs.length) return body
  return `${body.replace(/\s+$/, '')}\n\n${defs.join('\n')}`
}

/** Strip Markdown markers but keep line breaks (unlike stripMarkdown). */
function clearMarkdownMarkers(text) {
  return text
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/\[\^[^\]]*\]/g, '')
    .replace(/~~([\s\S]*?)~~/g, '$1')
    .replace(/(\*\*|__)([\s\S]*?)\1/g, '$2')
    .replace(/(\*|_)([\s\S]*?)\1/g, '$2')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^>\s?/gm, '')
    .replace(/^[-*+]\s+/gm, '')
    .replace(/^\d+\.\s+/gm, '')
}

/** Expand a range to include Markdown wraps that immediately surround it. */
function expandClearRange(value, start, end) {
  let s = start
  let e = end

  const tryWrap = (before, after) => {
    if (
      value.slice(s - before.length, s) === before
      && value.slice(e, e + after.length) === after
    ) {
      s -= before.length
      e += after.length
      return true
    }
    return false
  }

  tryWrap('**', '**') || tryWrap('__', '__')
  tryWrap('~~', '~~')
  tryWrap('*', '*') || tryWrap('_', '_')

  const linkSuffix = value.slice(e).match(/^\]\([^)]*\)/)
  if (value[s - 1] === '[' && linkSuffix) {
    s -= 1
    e += linkSuffix[0].length
  } else if (value.slice(s - 2, s) === '![' && linkSuffix) {
    s -= 2
    e += linkSuffix[0].length
  }

  return { start: s, end: e }
}

/**
 * Remove Markdown formatting from the selection.
 * If nothing is selected, clears the current line.
 */
export function clearSelectionFormatting(textarea) {
  const value = textarea.value
  let start = textarea.selectionStart
  let end = textarea.selectionEnd

  if (start === end) {
    start = value.lastIndexOf('\n', start - 1) + 1
    const nl = value.indexOf('\n', end)
    end = nl === -1 ? value.length : nl
  }

  ;({ start, end } = expandClearRange(value, start, end))

  const selected = value.slice(start, end)
  const cleared = clearMarkdownMarkers(selected)
  if (cleared === selected) return null

  return {
    next: value.slice(0, start) + cleared + value.slice(end),
    selectionStart: start,
    selectionEnd: start + cleared.length,
  }
}

/** Shared format actions used by the toolbar and keyboard shortcuts. */
export function markdownActions(textarea, onChange, { onRequestLink, onRequestImage, onRequestFootnote } = {}) {
  const run = fn => {
    const result = fn(textarea)
    if (result) applyToTextarea(textarea, result, onChange)
  }

  return {
    bold:   () => run(el => toggleWrapSelection(el, '**', '**', 'bold')),
    italic: () => run(el => toggleWrapSelection(el, '*', '*', 'italic')),
    strike: () => run(el => toggleWrapSelection(el, '~~', '~~', 'strikethrough')),
    heading: () => run(el => toggleLinePrefix(el, '## ')),
    quote:  () => run(el => toggleLinePrefix(el, '> ')),
    list:   () => run(el => toggleLinePrefix(el, '- ')),
    clear:  () => run(clearSelectionFormatting),
    link() {
      const removed = tryRemoveLink(textarea)
      if (removed) {
        applyToTextarea(textarea, removed, onChange)
        return
      }
      onRequestLink?.()
    },
    image() {
      onRequestImage?.()
    },
    footnote() {
      onRequestFootnote?.()
    },
    applyLink(url) {
      run(el => insertLink(el, url))
    },
    applyImage(url) {
      run(el => insertImage(el, url))
    },
    applyFootnote(id) {
      run(el => insertFootnoteRef(el, id))
    },
  }
}

/**
 * Conventional editor shortcuts (Mac + Windows):
 *   ⌘/Ctrl+B  bold
 *   ⌘/Ctrl+I  italic
 *   ⌘/Ctrl+K  link
 *   ⌘/Ctrl+Shift+X  strikethrough
 *   ⌘/Ctrl+\  clear formatting
 *   ⌘/Ctrl+Z  undo
 * Returns true if the event was handled.
 */
export function handleMarkdownKeyDown(e, textarea, onChange, extras = {}) {
  if (!(e.metaKey || e.ctrlKey) || e.altKey) return false

  const { onUndo, onRedo, ...promptHandlers } = extras
  const key = e.key.toLowerCase()
  const actions = markdownActions(textarea, onChange, promptHandlers)

  if (key === 'z') {
    e.preventDefault()
    if (e.shiftKey) onRedo?.()
    else onUndo?.()
    return true
  }
  if (key === 'y' && !e.shiftKey) {
    e.preventDefault()
    onRedo?.()
    return true
  }
  if (key === 'x' && e.shiftKey) {
    e.preventDefault()
    actions.strike()
    return true
  }
  if (key === 'b') {
    e.preventDefault()
    actions.bold()
    return true
  }
  if (key === 'i') {
    e.preventDefault()
    actions.italic()
    return true
  }
  if (key === 'k') {
    e.preventDefault()
    actions.link()
    return true
  }
  if (key === '\\' || e.code === 'Backslash') {
    e.preventDefault()
    actions.clear()
    return true
  }

  return false
}
