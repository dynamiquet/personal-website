/*
  pages/BlogPost.jsx — a single essay.

  Authors get read + edit modes. Edit mode includes a toolbar for font,
  size, alignment, Markdown formatting, footnotes, and live preview.
  Readers only see the reading view (Markdown + superscript footnotes).
*/

import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { usePostsContext } from '../context/PostsContext'
import EditToolbar from '../components/EditToolbar'
import EssayBody from '../components/EssayBody'
import FootnotesEditor from '../components/FootnotesEditor'
import MarkdownToolbar from '../components/MarkdownToolbar'
import { ConfirmDialog } from '../components/Dialog'
import {
  readingTime,
  excerptFromBody,
  essayDefaults,
  bodyFontClass,
  textSizeClass,
} from '../utils/helpers'
import { handleMarkdownKeyDown, stripMarkdown } from '../utils/markdown'

export default function BlogPost() {
  const { id }                          = useParams()
  const navigate                        = useNavigate()
  const { state: routerState }          = useLocation()
  const { isAuthor }                    = useAuth()
  const { posts, updatePost, deletePost } = usePostsContext()
  const bodyRef                         = useRef(null)
  const undoStackRef                    = useRef([])
  const redoStackRef                    = useRef([])
  const lastTypingAtRef                 = useRef(0)

  const post = posts.find(p => p.id === id)
  const defaults = essayDefaults(post)
  const backLabel = isAuthor ? '← My essays' : '← Essays'

  const [isEditing, setIsEditing] = useState(
    isAuthor && (routerState?.editing ?? false),
  )
  const [editTab, setEditTab]     = useState('write') // 'write' | 'preview'
  const [title, setTitle]         = useState(post?.title ?? '')
  const [body, setBody]           = useState(post?.body ?? '')
  const [footnotes, setFootnotes] = useState(defaults.footnotes)
  const [bodyFont, setBodyFont]   = useState(defaults.bodyFont)
  const [textSize, setTextSize]   = useState(defaults.textSize)
  const [align, setAlign]         = useState(defaults.align)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const promptApiRef = useRef({})

  useEffect(() => {
    if (!isAuthor) setIsEditing(false)
  }, [isAuthor])

  // Keep local edit fields in sync when switching essays.
  useEffect(() => {
    if (!post) return
    const d = essayDefaults(post)
    setTitle(post.title ?? '')
    setBody(post.body ?? '')
    setFootnotes(d.footnotes)
    setBodyFont(d.bodyFont)
    setTextSize(d.textSize)
    setAlign(d.align)
    setEditTab('write')
    undoStackRef.current = []
    redoStackRef.current = []
    lastTypingAtRef.current = 0
  }, [post?.id])

  function changeBody(next, { source = 'typing' } = {}) {
    if (next === body) return

    const now = Date.now()
    const startsTypingGroup = source !== 'typing' || now - lastTypingAtRef.current > 700
    if (startsTypingGroup) undoStackRef.current.push(body)

    lastTypingAtRef.current = source === 'typing' ? now : 0
    redoStackRef.current = []
    setBody(next)
  }

  function restoreBody(value) {
    setBody(value)
    lastTypingAtRef.current = 0
    requestAnimationFrame(() => {
      const el = bodyRef.current
      if (!el) return
      el.focus()
      el.setSelectionRange(value.length, value.length)
    })
  }

  function undoBody() {
    const previous = undoStackRef.current.pop()
    if (previous === undefined) return
    redoStackRef.current.push(body)
    restoreBody(previous)
  }

  function redoBody() {
    const next = redoStackRef.current.pop()
    if (next === undefined) return
    undoStackRef.current.push(body)
    restoreBody(next)
  }

  function updateFootnotes(next) {
    setFootnotes(next)
  }

  function removeFootnote(noteId) {
    setFootnotes(prev => prev.filter(f => f.id !== noteId))
    const marker = new RegExp(`\\[\\^${noteId}\\]`, 'g')
    changeBody(body.replace(marker, ''), { source: 'format' })
  }

  if (!post) {
    return (
      <section className="min-h-screen bg-grad-post pt-16 flex items-center
                          justify-center text-choc-text font-ui">
        <div className="text-center">
          <p className="text-choc-soft mb-4">Essay not found.</p>
          <Link to="/writings" className="text-choc-accent underline">
            {isAuthor ? '← Back to my essays' : '← Back to essays'}
          </Link>
        </div>
      </section>
    )
  }

  function save() {
    const excerpt = excerptFromBody(body) || post.excerpt
    updatePost(id, {
      title:     title.trim() || 'Untitled',
      body,
      footnotes,
      bodyFont,
      textSize,
      align,
      excerpt,
    })
  }

  function handleToggleEdit() {
    if (!isAuthor) return
    if (isEditing) save()
    setIsEditing(e => !e)
    setEditTab('write')
  }

  function handleDeleteConfirm() {
    if (!isAuthor) return
    setConfirmDelete(false)
    deletePost(id)
    navigate('/writings')
  }

  function handleSave() {
    if (!isAuthor) return
    save()
    setIsEditing(false)
  }

  const plainWords = stripMarkdown(body).split(/\s+/).filter(Boolean).length
  const showEditUi = isAuthor

  const viewFont  = isEditing ? bodyFont : (post.bodyFont ?? 'hand')
  const viewSize  = isEditing ? textSize : (post.textSize ?? 'md')
  const viewAlign = isEditing ? align    : (post.align ?? 'left')
  const viewBody  = isEditing ? body     : post.body
  const viewNotes = isEditing ? footnotes : (post.footnotes ?? [])
  const bodyClasses = `${bodyFontClass(viewFont)} ${textSizeClass(viewSize)} ${
    viewAlign === 'center' ? 'text-center' : 'text-left'
  }`

  const emptyBodyLabel = isAuthor
    ? 'No content yet — click Edit to write.'
    : 'No content yet.'

  return (
    <section className="min-h-screen bg-grad-post text-choc-text pt-16 pb-28 px-[6vw]">

      {showEditUi && isEditing && (
        <EditToolbar
          wordCount={plainWords}
          bodyFont={bodyFont}
          textSize={textSize}
          align={align}
          onBodyFont={setBodyFont}
          onTextSize={setTextSize}
          onAlign={setAlign}
          onReadingMode={handleToggleEdit}
          onDelete={() => setConfirmDelete(true)}
          onSave={handleSave}
        />
      )}

      {showEditUi && !isEditing && (
        <div className="max-w-[880px] mx-auto mb-5 flex justify-end">
          <button
            onClick={handleToggleEdit}
            className="font-ui text-[0.8rem] font-semibold px-4 py-2 rounded-full
                       bg-white/10 text-choc-text border border-white/25
                       hover:bg-white/20 transition-colors"
          >
            Edit
          </button>
        </div>
      )}

      <div className="max-w-[880px] mx-auto">

        <div className="flex items-center justify-between mb-8">
          <Link
            to="/writings"
            className="text-choc-accent text-[0.9rem] font-semibold font-ui
                       hover:opacity-80 transition-opacity"
          >
            {backLabel}
          </Link>
          <span className="text-choc-soft text-[0.8rem] font-ui">
            {post.date} · {readingTime(isEditing ? body : post.body)}
          </span>
        </div>

        {isEditing ? (
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Title"
            className={`w-full bg-transparent text-choc-text font-display font-medium
                        text-[clamp(1.9rem,4vw,2.8rem)] leading-snug mb-8
                        border-b border-choc-text/20 pb-2 outline-none
                        placeholder:text-choc-soft/50 focus:border-choc-accent
                        transition-colors
                        ${align === 'center' ? 'text-center' : 'text-left'}`}
          />
        ) : (
          <h1
            className={`font-display font-medium text-choc-text
                        text-[clamp(1.9rem,4vw,2.8rem)] leading-snug mb-8
                        ${viewAlign === 'center' ? 'text-center' : 'text-left'}`}
          >
            {post.title}
          </h1>
        )}

        {isEditing && (
          <div
            role="tablist"
            aria-label="Editor view"
            className="inline-flex rounded-full border border-white/20 bg-white/5 p-0.5 mb-4"
          >
            {[
              { id: 'write', label: 'Write' },
              { id: 'preview', label: 'Preview' },
            ].map(tab => {
              const active = editTab === tab.id
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setEditTab(tab.id)}
                  className={`font-ui text-[0.72rem] font-semibold px-3 py-1.5 rounded-full
                              transition-colors
                              ${active
                                ? 'bg-choc-accent text-choc-deep'
                                : 'text-choc-soft hover:text-choc-text hover:bg-white/10'
                              }`}
                >
                  {tab.label}
                </button>
              )
            })}
          </div>
        )}

        {isEditing && editTab === 'write' ? (
          <div>
            <MarkdownToolbar
              textareaRef={bodyRef}
              onChange={changeBody}
              footnotes={footnotes}
              onFootnotesChange={updateFootnotes}
              promptApiRef={promptApiRef}
            />
            <textarea
              ref={bodyRef}
              value={body}
              onChange={e => changeBody(e.target.value)}
              onKeyDown={e => handleMarkdownKeyDown(
                e,
                e.currentTarget,
                changeBody,
                {
                  onUndo: undoBody,
                  onRedo: redoBody,
                  onRequestLink: () => promptApiRef.current.openLink?.(),
                  onRequestImage: () => promptApiRef.current.openImage?.(),
                  onRequestFootnote: () => promptApiRef.current.openFootnote?.(),
                },
              )}
              placeholder={"Start writing…\n\nMarkdown works: **bold**, *italic*, ~~strike~~, [links](https://…), ![images](https://…), ## headings, footnotes via Note¹"}
              rows={16}
              className={`w-full bg-transparent text-choc-text resize-y outline-none
                          border border-choc-text/15 rounded-lg p-4 min-h-[20rem]
                          placeholder:text-choc-soft/40 focus:border-choc-accent/50
                          transition-colors ${bodyClasses}`}
            />
            <FootnotesEditor
              footnotes={footnotes}
              onChange={updateFootnotes}
              onRemove={removeFootnote}
            />
          </div>
        ) : (
          <EssayBody
            content={viewBody}
            footnotes={viewNotes}
            className={`${bodyClasses} text-choc-text`}
            emptyLabel={isEditing ? 'Nothing to preview yet.' : emptyBodyLabel}
          />
        )}

      </div>

      <ConfirmDialog
        open={confirmDelete}
        title="Delete this essay?"
        message="This cannot be undone. The essay will be removed from your writings."
        confirmLabel="Delete"
        danger
        onConfirm={handleDeleteConfirm}
        onCancel={() => setConfirmDelete(false)}
      />
    </section>
  )
}
