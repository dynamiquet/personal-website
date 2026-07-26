/*
  components/EssayBody.jsx

  Renders essay Markdown: headings, emphasis, links, images, lists,
  blockquotes, code, GFM extras, and footnotes (superscript + endnotes).

  Inline discussion annotations are applied in the DOM after render so
  offsets match the same visible-text model used by text selection.
*/

import { useLayoutEffect, useMemo } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { withFootnoteDefs } from '../utils/markdown'
import { applyDomAnnotations } from '../utils/commentAnchors'

function classNameToString(className) {
  if (!className) return ''
  return Array.isArray(className) ? className.join(' ') : String(className)
}

/** Smooth in-page jump for footnote refs / backrefs. */
function scrollToFootnoteTarget(e, href) {
  if (typeof href !== 'string' || !href.startsWith('#')) return
  const id = decodeURIComponent(href.slice(1))
  const el = document.getElementById(id)
  if (!el) return

  e.preventDefault()
  el.scrollIntoView({ behavior: 'smooth', block: 'center' })
  el.classList.add('essay-fn-flash')
  window.setTimeout(() => el.classList.remove('essay-fn-flash'), 1400)

  if (window.history?.replaceState) {
    window.history.replaceState(null, '', href)
  }
}

function isFootnoteHref(href) {
  return typeof href === 'string' && (
    href.includes('#user-content-fn')
    || href.startsWith('#fn')
  )
}

function openAnnotationThreads(e, onAnnotationActivate) {
  const mark = e.target.closest?.('mark.essay-annotation')
  if (!mark || !onAnnotationActivate) return false
  e.preventDefault()
  e.stopPropagation()
  const ids = (mark.getAttribute('data-thread-ids') || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)
  if (ids.length) onAnnotationActivate(ids)
  return true
}

const components = {
  h1: ({ children }) => (
    <h2 className="essay-h essay-h1">{children}</h2>
  ),
  h2: ({ children, className, node: _node, ...props }) => {
    const classStr = classNameToString(className)
    if (classStr.includes('sr-only') || props.id === 'footnote-label') {
      return <h2 className="essay-footnotes-title" id={props.id}>Notes</h2>
    }
    return <h2 className="essay-h essay-h2">{children}</h2>
  },
  h3: ({ children }) => (
    <h3 className="essay-h essay-h3">{children}</h3>
  ),
  h4: ({ children }) => (
    <h4 className="essay-h essay-h4">{children}</h4>
  ),
  p: ({ children }) => <p className="essay-p">{children}</p>,
  a: ({ href, children, node: _node, className, ...props }) => {
    if (isFootnoteHref(href)) {
      const isBack = props['data-footnote-backref'] !== undefined
      return (
        <a
          href={href}
          className={isBack ? 'essay-fn-back' : 'essay-fn-ref'}
          onClick={e => scrollToFootnoteTarget(e, href)}
          {...props}
        >
          {children}
        </a>
      )
    }
    const external = /^https?:\/\//i.test(href || '')
    return (
      <a
        href={href}
        className="essay-a"
        {...(external
          ? { target: '_blank', rel: 'noopener noreferrer' }
          : {})}
      >
        {children}
      </a>
    )
  },
  strong: ({ children }) => <strong className="essay-strong">{children}</strong>,
  em: ({ children }) => <em className="essay-em">{children}</em>,
  del: ({ children }) => <del className="essay-del">{children}</del>,
  ul: ({ children }) => <ul className="essay-ul">{children}</ul>,
  ol: ({ children, node: _node, className, ...props }) => (
    <ol className="essay-ol" {...props}>{children}</ol>
  ),
  li: ({ children, node: _node, className, ...props }) => (
    <li className="essay-li" {...props}>{children}</li>
  ),
  blockquote: ({ children }) => (
    <blockquote className="essay-quote">{children}</blockquote>
  ),
  code: ({ className, children }) => {
    const isBlock = typeof className === 'string' && className.includes('language-')
    if (isBlock) {
      return <code className="essay-code-block">{children}</code>
    }
    return <code className="essay-code">{children}</code>
  },
  pre: ({ children }) => <pre className="essay-pre">{children}</pre>,
  img: ({ src, alt }) => (
    <img src={src} alt={alt || ''} className="essay-img" loading="lazy" />
  ),
  hr: () => <hr className="essay-hr" />,
  table: ({ children }) => (
    <div className="essay-table-wrap">
      <table className="essay-table">{children}</table>
    </div>
  ),
  section: ({ children, className, node: _node, ...props }) => {
    const classStr = classNameToString(className)
    const isFootnotes = (
      props['data-footnotes'] !== undefined
      || classStr.includes('footnotes')
    )
    if (isFootnotes) {
      return (
        <section className="essay-footnotes" data-footnotes="">
          {children}
        </section>
      )
    }
    return <section className={classStr || undefined} {...props}>{children}</section>
  },
  // Keep id on the wrapping <sup> path: the <a> inside carries the real id.
  sup: ({ children }) => <sup className="essay-sup">{children}</sup>,
}

export default function EssayBody({
  content,
  footnotes = [],
  className = '',
  emptyLabel,
  annotationThreads = [],
  annotationsEnabled = true,
  onAnnotationActivate,
  bodyRef,
}) {
  const text = (content ?? '').trim()

  const markdown = useMemo(
    () => (text ? withFootnoteDefs(content, footnotes) : ''),
    [text, content, footnotes],
  )

  // Re-apply marks whenever markdown or discussion threads change.
  useLayoutEffect(() => {
    const root = bodyRef?.current
    if (!root) return undefined
    applyDomAnnotations(root, annotationThreads, { enabled: annotationsEnabled })
    return () => {
      // Clean marks before React replaces children on the next render.
      if (bodyRef?.current) applyDomAnnotations(bodyRef.current, [], { enabled: false })
    }
  }, [bodyRef, markdown, annotationThreads, annotationsEnabled])

  if (!text) {
    return emptyLabel ? (
      <p className={`text-choc-soft italic ${className}`}>{emptyLabel}</p>
    ) : null
  }

  return (
    <div
      ref={bodyRef}
      className={`essay-body ${className}`}
      onClick={e => openAnnotationThreads(e, onAnnotationActivate)}
      onKeyDown={e => {
        if (e.key !== 'Enter' && e.key !== ' ') return
        openAnnotationThreads(e, onAnnotationActivate)
      }}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {markdown}
      </ReactMarkdown>
    </div>
  )
}
