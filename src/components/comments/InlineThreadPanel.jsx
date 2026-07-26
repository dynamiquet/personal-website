/*
  components/comments/InlineThreadPanel.jsx
*/

import { useEffect, useRef } from 'react'
import CommentComposer from './CommentComposer'
import CommentTree, { AuthorAvatar } from './CommentTree'
import ReactionBar from './ReactionBar'
import {
  buildCommentTree,
  reactionAuthorLabel,
  reactionEmojiGlyph,
  summarizeReactions,
} from '../../data/discussions'
import { truncateQuote } from '../../utils/commentAnchors'

function ExcerptReactionList({ reactions }) {
  if (!reactions?.length) return null

  return (
    <ul className="space-y-2" data-comment-ui="">
      {reactions.map((reaction) => {
        const label = reactionAuthorLabel(reaction)

        return (
          <li
            key={reaction.id}
            className="flex items-center gap-2 font-ui text-[0.85rem] text-choc-text"
          >
            <AuthorAvatar author={reaction.author} />
            <span className="min-w-0 truncate" title={label}>
              {label}
            </span>
            <span aria-hidden="true" className="shrink-0 text-[1rem]">
              {reactionEmojiGlyph(reaction.emoji)}
            </span>
            <span className="sr-only">
              {`${label} reacted with ${reaction.emoji}`}
            </span>
          </li>
        )
      })}
    </ul>
  )
}

export default function InlineThreadPanel({
  open,
  threads,
  comments,
  reactions,
  viewerId,
  viewerIsAuthor = false,
  isSignedIn,
  onClose,
  onToggleExcerptReaction,
  onReply,
  onToggleCommentReaction,
  onAddTopLevelComment,
  canDeleteComment,
  onDeleteComment,
}) {
  const panelRef = useRef(null)
  const previouslyFocused = useRef(null)

  useEffect(() => {
    if (!open) return undefined
    previouslyFocused.current = document.activeElement
    const node = panelRef.current
    const focusable = node?.querySelector(
      'button, [href], textarea, input, select, [tabindex]:not([tabindex="-1"])',
    )
    focusable?.focus?.()

    function onKey(e) {
      if (e.key === 'Escape') onClose?.()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      previouslyFocused.current?.focus?.()
    }
  }, [open, onClose])

  if (!open || !threads?.length) return null

  const singleThreadHasComments = threads.length === 1 && comments.some(
    c => c.scope === 'inline' && c.threadId === threads[0].id,
  )

  return (
    <>
      <button
        type="button"
        aria-label="Close comment panel backdrop"
        className="fixed inset-0 z-[70] bg-black/40 md:hidden"
        onClick={onClose}
        data-comment-ui=""
      />
      <aside
        ref={panelRef}
        data-comment-ui=""
        role="dialog"
        aria-label="Inline comment threads"
        className="fixed z-[80] flex flex-col border border-white/15 bg-choc-deep/95
                   shadow-2xl backdrop-blur-md
                   inset-x-0 bottom-0 max-h-[75vh] rounded-t-2xl
                   md:inset-auto md:right-4 md:top-20 md:bottom-4 md:w-[min(26rem,92vw)]
                   md:max-h-none md:rounded-2xl"
      >
        <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
          <h2 className="font-ui text-[0.9rem] font-semibold text-choc-text">
            {threads.length === 1
              ? (singleThreadHasComments ? 'Comment thread' : 'Reaction')
              : `${threads.length} threads`}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full px-2.5 py-1 font-ui text-[0.78rem] text-choc-soft
                       hover:bg-white/10 hover:text-choc-text transition-colors"
          >
            Close
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-5">
          {threads.map((thread) => {
            const tree = buildCommentTree(comments, {
              threadId: thread.id,
              scope: 'inline',
            })
            const excerptReactions = reactions.filter(
              r => r.targetType === 'excerpt' && r.targetId === thread.id,
            )
            const excerptReactionSummary = summarizeReactions(excerptReactions, viewerId)
            const fullQuote = thread.anchor?.quote ?? ''
            const preview = truncateQuote(fullQuote)
            const reactionOnly = tree.length === 0

            return (
              <section key={thread.id} className="space-y-3">
                <blockquote
                  className="rounded-lg border border-white/10 bg-white/5 px-3 py-2
                             font-ui text-[0.82rem] text-choc-soft"
                  title={fullQuote}
                >
                  <span className="sr-only">Full excerpt: {fullQuote}. Preview: </span>
                  “{preview}”
                </blockquote>

                {reactionOnly ? (
                  <ExcerptReactionList reactions={excerptReactions} />
                ) : (
                  <>
                    <ReactionBar
                      summary={excerptReactionSummary}
                      onToggle={emoji => onToggleExcerptReaction?.(thread.id, emoji)}
                    />

                    <CommentTree
                      tree={tree}
                      reactions={reactions}
                      viewerId={viewerId}
                      viewerIsAuthor={viewerIsAuthor}
                      isSignedIn={isSignedIn}
                      emptyLabel="No comments on this excerpt yet."
                      onToggleReaction={onToggleCommentReaction}
                      onReply={(parentId, text) => onReply?.(thread.id, parentId, text)}
                      canDelete={canDeleteComment}
                      onDelete={onDeleteComment}
                    />

                    <CommentComposer
                      isSignedIn={isSignedIn}
                      compact
                      placeholder="Add a comment on this excerpt…"
                      onSubmit={text => onAddTopLevelComment?.(thread.id, text)}
                    />
                  </>
                )}
              </section>
            )
          })}
        </div>
      </aside>
    </>
  )
}
