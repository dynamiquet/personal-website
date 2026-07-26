/*
  pages/BlogPost.jsx — a single essay.

  Authors get read + edit modes. Edit mode includes a toolbar for font,
  size, alignment, Markdown formatting, footnotes, and live preview.
  Readers only see the reading view (Markdown + superscript footnotes).

  Reading mode also hosts inline excerpt discussion and a general
  comment section (discussions still use the local JSON API for now).
*/

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { usePostsContext } from '../context/PostsContext'
import { useDiscussion } from '../context/DiscussionContext'
import EditToolbar from '../components/EditToolbar'
import EssayBody from '../components/EssayBody'
import FootnotesEditor from '../components/FootnotesEditor'
import MarkdownToolbar from '../components/MarkdownToolbar'
import { ConfirmDialog } from '../components/Dialog'
import CommentsVisibilityToggle from '../components/comments/CommentsVisibilityToggle'
import SelectionToolbar from '../components/comments/SelectionToolbar'
import InlineThreadPanel from '../components/comments/InlineThreadPanel'
import GeneralCommentsSection from '../components/comments/GeneralCommentsSection'
import {
  readingTime,
  excerptFromBody,
  essayDefaults,
  bodyFontClass,
  textSizeClass,
} from '../utils/helpers'
import { handleMarkdownKeyDown, stripMarkdown } from '../utils/markdown'
import { selectionToAnchor } from '../utils/commentAnchors'

export default function BlogPost() {
  const { id }                          = useParams()
  const navigate                        = useNavigate()
  const { state: routerState }          = useLocation()
  const { isAuthor }                    = useAuth()
  const { posts, isLoaded: postsLoaded, updatePost, deletePost } = usePostsContext()
  const {
    isSignedIn,
    viewerId,
    getDiscussionForPost,
    createInlineThreadWithComment,
    createInlineReaction,
    toggleExcerptReaction,
    addArticleComment,
    addInlineReply,
    toggleCommentReaction,
    canDeleteComment,
    deleteComment,
  } = useDiscussion()

  const bodyRef                         = useRef(null)
  const essayRootRef                    = useRef(null)
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

  const [showOthersComments, setShowOthersComments] = useState(true)
  const [selectionState, setSelectionState] = useState(null)
  const [activeThreadIds, setActiveThreadIds] = useState(null)

  const discussion = useMemo(
    () => (post ? getDiscussionForPost(post.id) : { inlineThreads: [], comments: [], reactions: [] }),
    [post, getDiscussionForPost],
  )

  const annotationThreads = useMemo(() => (
    discussion.inlineThreads.filter((thread) => {
      const hasComment = discussion.comments.some(c => c.threadId === thread.id)
      const hasReaction = discussion.reactions.some(
        r => r.targetType === 'excerpt' && r.targetId === thread.id,
      )
      return hasComment || hasReaction
    })
  ), [discussion])

  const readingMode = !isEditing

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
    setSelectionState(null)
    setActiveThreadIds(null)
  }, [post?.id])

  useEffect(() => {
    if (!readingMode) {
      setSelectionState(null)
      setActiveThreadIds(null)
    }
  }, [readingMode])

  const clearSelectionUi = useCallback(() => {
    setSelectionState(null)
  }, [])

  const handleAnnotationActivate = useCallback((threadIds) => {
    if (!showOthersComments) return
    setSelectionState(null)
    setActiveThreadIds(threadIds)
  }, [showOthersComments])

  useEffect(() => {
    if (!readingMode) return undefined

    function refreshFromSelection() {
      const sel = window.getSelection()
      const root = essayRootRef.current
      if (!sel || !root || sel.isCollapsed) {
        return false
      }
      const anchor = selectionToAnchor(root, sel)
      if (!anchor) {
        return false
      }
      try {
        const range = sel.getRangeAt(0)
        const rect = range.getBoundingClientRect()
        if (!rect || (rect.width === 0 && rect.height === 0)) return false
        setActiveThreadIds(null)
        setSelectionState({ anchor, rect: {
          top: rect.top,
          bottom: rect.bottom,
          left: rect.left,
          width: rect.width,
          height: rect.height,
        } })
        return true
      } catch {
        return false
      }
    }

    function onMouseUp(e) {
      if (e.target.closest?.('[data-comment-ui]')) return
      window.setTimeout(() => {
        const opened = refreshFromSelection()
        // Click collapsed the selection (or landed elsewhere) — dismiss the box.
        if (!opened) clearSelectionUi()
      }, 0)
    }

    function onKeyUp(e) {
      // Shift/arrow selection shortcuts — ignore while typing in comment UI
      // (capital letters release Shift and would otherwise dismiss the composer).
      if (e.target?.closest?.('[data-comment-ui]')) return
      if (document.activeElement?.closest?.('[data-comment-ui]')) return
      if (e.key === 'Shift' || e.key.startsWith('Arrow') || e.key === 'a' && (e.metaKey || e.ctrlKey)) {
        window.setTimeout(() => {
          if (!refreshFromSelection()) clearSelectionUi()
        }, 0)
      }
    }

    function onPointerDown(e) {
      if (e.target.closest?.('[data-comment-ui]')) return
      // Right-click / context-menu shouldn't dismiss the composer.
      if (e.button === 2) return
      // Any primary click outside the toolbar dismisses it. A real text
      // selection will reopen it on mouseup.
      clearSelectionUi()
    }

    document.addEventListener('mouseup', onMouseUp)
    document.addEventListener('keyup', onKeyUp)
    document.addEventListener('pointerdown', onPointerDown)
    return () => {
      document.removeEventListener('mouseup', onMouseUp)
      document.removeEventListener('keyup', onKeyUp)
      document.removeEventListener('pointerdown', onPointerDown)
    }
  }, [readingMode, clearSelectionUi])

  // Autosave 3s after the last edit while in edit mode.
  useEffect(() => {
    if (!isEditing || !isAuthor || !post) return undefined
    const d = essayDefaults(post)
    const dirty = (
      title !== (post.title ?? '')
      || body !== (post.body ?? '')
      || JSON.stringify(footnotes) !== JSON.stringify(d.footnotes)
      || bodyFont !== d.bodyFont
      || textSize !== d.textSize
      || align !== d.align
    )
    if (!dirty) return undefined
    const timer = window.setTimeout(() => save(), 3000)
    return () => window.clearTimeout(timer)
  }, [isEditing, isAuthor, post, title, body, footnotes, bodyFont, textSize, align])

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
    // Posts arrive asynchronously from Supabase — don't cry "not found" mid-load.
    if (!postsLoaded) {
      return (
        <section className="min-h-screen bg-grad-post pt-16 flex items-center
                            justify-center text-choc-text font-ui">
          <p className="text-choc-soft">Loading essay…</p>
        </section>
      )
    }

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
    return updatePost(id, {
      title:     title.trim() || 'Untitled',
      body,
      footnotes,
      bodyFont,
      textSize,
      align,
      excerpt,
    }).catch((err) => {
      console.warn('Failed to save post', err)
    })
  }

  function handleToggleEdit() {
    if (!isAuthor) return
    if (isEditing) save()
    setIsEditing(e => !e)
    setEditTab('write')
  }

  async function handleDeleteConfirm() {
    if (!isAuthor) return
    setConfirmDelete(false)
    try {
      await deletePost(id)
      navigate('/writings')
    } catch (err) {
      console.warn('Failed to delete post', err)
    }
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

  const activeThreads = (activeThreadIds ?? [])
    .map(tid => discussion.inlineThreads.find(t => t.id === tid))
    .filter(Boolean)

  function handleSelectionReact(emoji) {
    if (!selectionState?.anchor) return
    const result = createInlineReaction({
      postId: post.id,
      anchor: selectionState.anchor,
      emoji,
    })
    if (result?.ok) {
      window.getSelection()?.removeAllRanges()
      clearSelectionUi()
      if (result.thread?.id) setActiveThreadIds([result.thread.id])
    }
  }

  function handleSelectionComment(text) {
    if (!selectionState?.anchor) return { ok: false }
    const result = createInlineThreadWithComment({
      postId: post.id,
      anchor: selectionState.anchor,
      text,
    })
    if (result?.ok) {
      window.getSelection()?.removeAllRanges()
      clearSelectionUi()
      setActiveThreadIds([result.thread.id])
    }
    return result
  }

  const panelOpen = readingMode && Boolean(activeThreadIds?.length)

  return (
    <section
      className={`min-h-screen bg-grad-post text-choc-text pt-16 pb-28 px-[6vw]
                  transition-[padding] duration-300
                  ${panelOpen ? 'md:pr-[calc(min(26rem,92vw)+2rem)]' : ''}`}
    >

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

        <div className="flex items-center justify-between mb-8 gap-3 flex-wrap">
          <Link
            to="/writings"
            className="text-choc-accent text-[0.9rem] font-semibold font-ui
                       hover:opacity-80 transition-opacity"
          >
            {backLabel}
          </Link>
          <div className="flex items-center gap-4 flex-wrap justify-end">
            {readingMode && (
              <CommentsVisibilityToggle
                checked={showOthersComments}
                onChange={(next) => {
                  setShowOthersComments(next)
                  if (!next) setActiveThreadIds(null)
                }}
              />
            )}
            <span className="text-choc-soft text-[0.8rem] font-ui">
              {post.date} · {readingTime(isEditing ? body : post.body)}
            </span>
          </div>
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
          <>
            <EssayBody
              content={viewBody}
              footnotes={viewNotes}
              className={`${bodyClasses} text-choc-text`}
              emptyLabel={isEditing ? 'Nothing to preview yet.' : emptyBodyLabel}
              bodyRef={readingMode ? essayRootRef : undefined}
              annotationThreads={readingMode ? annotationThreads : []}
              annotationsEnabled={readingMode && showOthersComments}
              onAnnotationActivate={readingMode ? handleAnnotationActivate : undefined}
            />

            {readingMode && (
              <GeneralCommentsSection
                comments={discussion.comments}
                reactions={discussion.reactions}
                viewerId={viewerId}
                viewerIsAuthor={isAuthor}
                isSignedIn={isSignedIn}
                onAddComment={text => addArticleComment({ postId: post.id, text })}
                onReply={(parentId, text) => addArticleComment({
                  postId: post.id,
                  text,
                  parentId,
                })}
                onToggleCommentReaction={(commentId, emoji) => (
                  toggleCommentReaction({ commentId, emoji })
                )}
                canDeleteComment={canDeleteComment}
                onDeleteComment={commentId => deleteComment({ commentId })}
              />
            )}
          </>
        )}

      </div>

      {readingMode && selectionState && (
        <SelectionToolbar
          anchor={selectionState.anchor}
          rangeRect={selectionState.rect}
          isSignedIn={isSignedIn}
          onClose={clearSelectionUi}
          onReact={handleSelectionReact}
          onComment={handleSelectionComment}
        />
      )}

      {readingMode && (
        <InlineThreadPanel
          open={Boolean(activeThreadIds?.length)}
          threads={activeThreads}
          comments={discussion.comments}
          reactions={discussion.reactions}
          viewerId={viewerId}
          viewerIsAuthor={isAuthor}
          isSignedIn={isSignedIn}
          onClose={() => setActiveThreadIds(null)}
          onToggleExcerptReaction={(threadId, emoji) => (
            toggleExcerptReaction({ threadId, emoji })
          )}
          onToggleCommentReaction={(commentId, emoji) => (
            toggleCommentReaction({ commentId, emoji })
          )}
          onReply={(threadId, parentId, text) => addInlineReply({
            postId: post.id,
            threadId,
            parentId,
            text,
          })}
          canDeleteComment={canDeleteComment}
          onDeleteComment={commentId => deleteComment({ commentId })}
        />
      )}

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
