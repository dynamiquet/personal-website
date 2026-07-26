/*
  utils/commentAnchors.js

  Selection → durable excerpt anchors, and re-anchoring against current body text.
*/

const CONTEXT_CHARS = 32

export function fingerprintBody(text) {
  const value = String(text ?? '')
  let hash = 2166136261
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return (hash >>> 0).toString(16)
}

export function truncateQuote(quote, maxWords = 12) {
  const text = String(quote ?? '').replace(/\s+/g, ' ').trim()
  if (!text) return ''
  const words = text.split(' ')
  if (words.length <= maxWords) return text
  const headCount = Math.max(3, Math.floor(maxWords / 2))
  const tailCount = Math.max(2, maxWords - headCount)
  const head = words.slice(0, headCount).join(' ')
  const tail = words.slice(-tailCount).join(' ')
  return `${head}… ${tail}`
}

function isSkippableRoot(el) {
  if (!el || el.nodeType !== 1) return false
  if (el.matches?.('[data-footnotes], .essay-footnotes')) return true
  if (el.closest?.('[data-comment-ui]')) return true
  return false
}

/** Collect ordered visible text nodes under root, skipping footnotes/UI. */
export function collectTextNodes(root) {
  if (!root) return []
  const nodes = []
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const parent = node.parentElement
      if (!parent) return NodeFilter.FILTER_REJECT
      if (isSkippableRoot(parent) || parent.closest?.('[data-footnotes], .essay-footnotes, [data-comment-ui]')) {
        return NodeFilter.FILTER_REJECT
      }
      if (!node.nodeValue) return NodeFilter.FILTER_REJECT
      return NodeFilter.FILTER_ACCEPT
    },
  })
  let current = walker.nextNode()
  while (current) {
    nodes.push(current)
    current = walker.nextNode()
  }
  return nodes
}

export function getVisibleText(root) {
  return collectTextNodes(root).map(n => n.nodeValue).join('')
}

function rangeOffsetsInRoot(root, range) {
  const nodes = collectTextNodes(root)
  let offset = 0
  let start = null
  let end = null

  for (const node of nodes) {
    const length = node.nodeValue.length

    if (start === null) {
      if (node === range.startContainer) {
        start = offset + Math.min(Math.max(range.startOffset, 0), length)
      } else if (
        range.startContainer.nodeType === 1
        && range.startContainer.contains(node)
      ) {
        start = offset
      }
    }

    if (node === range.endContainer) {
      end = offset + Math.min(Math.max(range.endOffset, 0), length)
    } else if (
      range.endContainer.nodeType === 1
      && range.endContainer.contains(node)
    ) {
      end = offset + length
    }

    offset += length
  }

  if (start === null || end === null) return null
  if (end < start) {
    const tmp = start
    start = end
    end = tmp
  }
  return { start, end }
}

function trimOffsets(text, start, end) {
  let s = start
  let e = end
  while (s < e && /\s/.test(text[s])) s += 1
  while (e > s && /\s/.test(text[e - 1])) e -= 1
  return { start: s, end: e }
}

export function selectionToAnchor(root, selection = window.getSelection()) {
  if (!root || !selection || selection.rangeCount === 0 || selection.isCollapsed) {
    return null
  }

  const range = selection.getRangeAt(0)
  if (!root.contains(range.commonAncestorContainer)) return null

  // Reject selections that only live inside footnotes/UI
  const ancestor = range.commonAncestorContainer.nodeType === 1
    ? range.commonAncestorContainer
    : range.commonAncestorContainer.parentElement
  if (ancestor?.closest?.('[data-footnotes], .essay-footnotes, [data-comment-ui]')) {
    return null
  }

  const visible = getVisibleText(root)
  const offsets = rangeOffsetsInRoot(root, range)
  if (!offsets) return null

  const trimmed = trimOffsets(visible, offsets.start, offsets.end)
  if (trimmed.end <= trimmed.start) return null

  const quote = visible.slice(trimmed.start, trimmed.end)
  if (!quote.trim()) return null

  return {
    start: trimmed.start,
    end: trimmed.end,
    quote,
    prefix: visible.slice(Math.max(0, trimmed.start - CONTEXT_CHARS), trimmed.start),
    suffix: visible.slice(trimmed.end, Math.min(visible.length, trimmed.end + CONTEXT_CHARS)),
    bodyFingerprint: fingerprintBody(visible),
  }
}

/**
 * Resolve a stored anchor against current visible text.
 * Returns updated offsets or null if it cannot be placed safely.
 */
export function resolveAnchor(visibleText, anchor) {
  if (!anchor || typeof visibleText !== 'string') return null
  const quote = String(anchor.quote ?? '')
  if (!quote) return null

  const exactStart = Number.isInteger(anchor.start) ? anchor.start : -1
  const exactEnd = Number.isInteger(anchor.end) ? anchor.end : -1
  if (
    exactStart >= 0
    && exactEnd > exactStart
    && visibleText.slice(exactStart, exactEnd) === quote
  ) {
    return { start: exactStart, end: exactEnd, quote }
  }

  // Prefer quote flanked by stored context when the body drifted.
  const prefix = String(anchor.prefix ?? '')
  const suffix = String(anchor.suffix ?? '')
  const needle = `${prefix}${quote}${suffix}`
  if (prefix || suffix) {
    const idx = visibleText.indexOf(needle)
    if (idx !== -1) {
      const start = idx + prefix.length
      return { start, end: start + quote.length, quote }
    }
  }

  // Unique exact quote match only — refuse ambiguous placement.
  let first = -1
  let count = 0
  let from = 0
  while (from <= visibleText.length) {
    const found = visibleText.indexOf(quote, from)
    if (found === -1) break
    count += 1
    if (first === -1) first = found
    if (count > 1) return null
    from = found + Math.max(1, quote.length)
  }
  if (count === 1 && first !== -1) {
    return { start: first, end: first + quote.length, quote }
  }

  return null
}

export function findMatchingThread(threads, postId, anchor) {
  if (!anchor) return null
  return (threads ?? []).find(thread => (
    thread.postId === postId
    && thread.anchor
    && thread.anchor.start === anchor.start
    && thread.anchor.end === anchor.end
    && thread.anchor.quote === anchor.quote
  )) ?? null
}

/**
 * Build non-overlapping atomic segments labeled with all covering thread IDs.
 * Input ranges: [{ id, start, end }]
 */
export function buildOverlapSegments(ranges, textLength) {
  const points = new Set([0, textLength])
  for (const range of ranges) {
    if (range.start < textLength) points.add(Math.max(0, range.start))
    if (range.end > 0) points.add(Math.min(textLength, range.end))
  }
  const sorted = [...points].sort((a, b) => a - b)
  const segments = []

  for (let i = 0; i < sorted.length - 1; i += 1) {
    const start = sorted[i]
    const end = sorted[i + 1]
    if (end <= start) continue
    const threadIds = ranges
      .filter(r => r.start < end && r.end > start)
      .map(r => r.id)
    segments.push({ start, end, threadIds })
  }

  return segments
}

/** Remove previously applied annotation marks without changing text content. */
export function unwrapDomAnnotations(root) {
  if (!root) return
  const marks = root.querySelectorAll('mark.essay-annotation')
  marks.forEach((mark) => {
    const parent = mark.parentNode
    if (!parent) return
    while (mark.firstChild) parent.insertBefore(mark.firstChild, mark)
    parent.removeChild(mark)
  })
  root.normalize()
}

/**
 * Apply dotted-underline marks for resolved threads using the same DOM text
 * model as selectionToAnchor (so create + render stay aligned).
 */
export function applyDomAnnotations(root, threads, { enabled = true } = {}) {
  if (!root) return []
  unwrapDomAnnotations(root)
  if (!enabled || !threads?.length) return []

  const visible = getVisibleText(root)
  const ranges = []
  for (const thread of threads) {
    const resolved = resolveAnchor(visible, thread.anchor)
    if (!resolved) continue
    ranges.push({ id: thread.id, start: resolved.start, end: resolved.end })
  }
  if (!ranges.length) return []

  const segments = buildOverlapSegments(ranges, visible.length)
    .filter(s => s.threadIds.length > 0)

  // Map global offsets → concrete text node slices, then wrap from the end
  // so earlier offsets stay valid while we mutate the DOM.
  const nodes = collectTextNodes(root)
  const slices = []
  let offset = 0
  for (const node of nodes) {
    const length = node.nodeValue.length
    const nodeStart = offset
    const nodeEnd = offset + length
    for (const seg of segments) {
      const start = Math.max(seg.start, nodeStart)
      const end = Math.min(seg.end, nodeEnd)
      if (end <= start) continue
      slices.push({
        node,
        localStart: start - nodeStart,
        localEnd: end - nodeStart,
        threadIds: seg.threadIds,
      })
    }
    offset = nodeEnd
  }

  // Process last→first within each node so splits don't invalidate offsets.
  slices.sort((a, b) => {
    if (a.node !== b.node) return 0
    return b.localStart - a.localStart
  })

  // Group by node while preserving reverse order
  const byNode = new Map()
  for (const slice of slices) {
    if (!byNode.has(slice.node)) byNode.set(slice.node, [])
    byNode.get(slice.node).push(slice)
  }

  for (const [node, nodeSlices] of byNode) {
    nodeSlices.sort((a, b) => b.localStart - a.localStart)
    for (const slice of nodeSlices) {
      if (!node.parentNode) continue
      if (slice.localStart < 0 || slice.localEnd > node.nodeValue.length) continue

      const trailing = node.splitText(slice.localEnd)
      const middle = node.splitText(slice.localStart)
      // middle holds the annotated text; node is the prefix; trailing is suffix
      void trailing

      const mark = document.createElement('mark')
      mark.className = 'essay-annotation'
      mark.setAttribute('data-thread-ids', slice.threadIds.join(','))
      mark.setAttribute('tabindex', '0')
      mark.setAttribute('role', 'button')
      mark.setAttribute(
        'aria-label',
        `View ${slice.threadIds.length} comment thread${slice.threadIds.length === 1 ? '' : 's'}`,
      )
      middle.parentNode.insertBefore(mark, middle)
      mark.appendChild(middle)
    }
  }

  return ranges
}
