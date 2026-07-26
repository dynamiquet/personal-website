/*
  components/EssayBody.jsx

  Renders essay Markdown: headings, emphasis, links, images, lists,
  blockquotes, code, GFM extras, and footnotes (superscript + endnotes).

  Footnote superscripts and ↩ backrefs keep their ids/hrefs so clicks
  scroll between the marker and the Notes entry.
*/

import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { withFootnoteDefs } from '../utils/markdown'

function classNameToString(className) {
  if (!className) return ''
  return Array.isArray(className) ? className.join(' ') : String(className)
}

function isFootnoteHref(href) {
  return typeof href === 'string' && (
    href.includes('#user-content-fn')
    || href.startsWith('#fn')
  )
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
}) {
  const text = (content ?? '').trim()

  if (!text) {
    return emptyLabel ? (
      <p className={`text-choc-soft italic ${className}`}>{emptyLabel}</p>
    ) : null
  }

  const markdown = withFootnoteDefs(content, footnotes)

  return (
    <div className={`essay-body ${className}`}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {markdown}
      </ReactMarkdown>
    </div>
  )
}
