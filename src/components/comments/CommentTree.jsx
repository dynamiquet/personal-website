/*
  components/comments/CommentTree.jsx

  Minimal cards: avatar + email + text, then reactions / reply / delete.
  Timestamps are private — visible on your own comments, or on everyone's
  when you're the site author.
*/

import { useState } from 'react'
import CommentComposer from './CommentComposer'
import ReactionBar from './ReactionBar'
import { summarizeReactions } from '../../data/discussions'

const COMMENT_PREVIEW_CHARS = 280

function formatTime(iso) {
  if (!iso) return ''
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  } catch {
    return ''
  }
}

function canSeeTimestamp(author, viewerId, viewerIsAuthor) {
  if (viewerIsAuthor) return true
  if (!viewerId || !author?.id) return false
  return author.id === viewerId
}

function AuthorAvatar({ author, size = 'sm' }) {
  const dim = size === 'sm' ? 'h-6 w-6' : 'h-7 w-7'
  const url = author?.avatarUrl
  const label = author?.displayName || author?.email || 'Reader'

  if (url) {
    return (
      <img
        src={url}
        alt=""
        title={label}
        className={`${dim} shrink-0 rounded-full object-cover bg-white/10`}
      />
    )
  }

  const initial = (label.trim()[0] || '?').toUpperCase()
  return (
    <span
      aria-hidden="true"
      title={label}
      className={`${dim} inline-flex shrink-0 items-center justify-center rounded-full
                  bg-white/15 font-ui text-[0.7rem] font-semibold text-choc-soft`}
    >
      {initial}
    </span>
  )
}

function CommentBody({ text }) {
  const [expanded, setExpanded] = useState(false)
  const full = text ?? ''
  const needsTrim = full.length > COMMENT_PREVIEW_CHARS
  const shown = !needsTrim || expanded
    ? full
    : `${full.slice(0, COMMENT_PREVIEW_CHARS).trimEnd()}…`

  return (
    <div className="mb-2">
      <p className="whitespace-pre-wrap font-ui text-[0.88rem] leading-relaxed text-choc-text">
        {shown}
      </p>
      {needsTrim && (
        <button
          type="button"
          onClick={() => setExpanded(v => !v)}
          className="mt-1 font-ui text-[0.75rem] font-medium text-choc-accent
                     hover:opacity-80 transition-opacity"
        >
          {expanded ? 'Show less' : 'Show more'}
        </button>
      )}
    </div>
  )
}

function countDescendantReplies(comment) {
  let n = 0
  for (const child of comment?.replies ?? []) {
    n += 1 + countDescendantReplies(child)
  }
  return n
}

function CommentNode({
  comment,
  reactions,
  viewerId,
  viewerIsAuthor,
  isSignedIn,
  onReply,
  onToggleReaction,
  canDelete,
  onDelete,
  depth = 0,
}) {
  const [replying, setReplying] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const summary = summarizeReactions(
    (reactions ?? []).filter(r => r.targetType === 'comment' && r.targetId === comment.id),
    viewerId,
  )
  const authorLabel = comment.author?.email
    || comment.author?.displayName
    || 'Reader'
  const timestamp = canSeeTimestamp(comment.author, viewerId, viewerIsAuthor)
    ? formatTime(comment.createdAt)
    : ''
  const replyCount = countDescendantReplies(comment)
  const deleteConfirmLabel = replyCount > 0
    ? `Delete + ${replyCount} ${replyCount === 1 ? 'reply' : 'replies'}?`
    : 'Confirm delete?'

  return (
    <article
      className={`rounded-xl border p-3 ${
        comment.author?.isAuthor
          ? 'border-choc-accent/45 bg-choc-accent/10'
          : 'border-white/10 bg-white/[0.03]'
      }`}
      data-comment-ui=""
    >
      <header className="mb-1.5 flex items-center gap-2">
        <AuthorAvatar author={comment.author} />
        <div className="min-w-0 flex flex-1 flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <span className="min-w-0 truncate font-ui text-[0.78rem] font-semibold text-choc-text">
            {authorLabel}
          </span>
          {comment.author?.isAuthor && (
            <span className="shrink-0 rounded-full bg-choc-accent px-1.5 py-0.5 font-ui
                             text-[0.65rem] font-bold uppercase tracking-wide text-choc-deep">
              Author
            </span>
          )}
          {timestamp && (
            <time
              dateTime={comment.createdAt}
              className="shrink-0 font-ui text-[0.72rem] text-choc-soft"
            >
              {timestamp}
            </time>
          )}
        </div>
      </header>

      <CommentBody text={comment.text} />

      <div className="flex flex-wrap items-center gap-2">
        <ReactionBar
          summary={summary}
          size="sm"
          onToggle={emoji => onToggleReaction?.(comment.id, emoji)}
        />
        <button
          type="button"
          onClick={() => setReplying(v => !v)}
          className="rounded-full px-2 py-1 font-ui text-[0.72rem] text-choc-soft
                     hover:bg-white/10 hover:text-choc-text transition-colors"
        >
          Reply
        </button>
        {canDelete?.(comment) && (
          <button
            type="button"
            title={replyCount > 0
              ? 'This also permanently deletes all replies and reactions on this thread.'
              : 'Permanently delete this comment and its reactions.'}
            onClick={() => {
              if (!confirmingDelete) {
                setConfirmingDelete(true)
                return
              }
              setConfirmingDelete(false)
              onDelete?.(comment.id)
            }}
            onBlur={() => setConfirmingDelete(false)}
            className={`rounded-full px-2 py-1 font-ui text-[0.72rem] transition-colors
                        ${confirmingDelete
                          ? 'bg-red-500/20 text-red-300 hover:bg-red-500/30'
                          : 'text-choc-soft hover:bg-white/10 hover:text-red-300'
                        }`}
          >
            {confirmingDelete ? deleteConfirmLabel : 'Delete'}
          </button>
        )}
      </div>

      {replying && (
        <div className="mt-3">
          <CommentComposer
            isSignedIn={isSignedIn}
            compact
            autoFocus
            submitLabel="Reply"
            placeholder="Write a reply…"
            onCancel={() => setReplying(false)}
            onSubmit={(text) => {
              const result = onReply?.(comment.id, text)
              if (result?.ok !== false) setReplying(false)
              return result
            }}
          />
        </div>
      )}

      {comment.replies?.length > 0 && (
        <div className="mt-3 space-y-2 border-l border-white/10 pl-3" style={{ marginLeft: Math.min(depth, 8) * 2 }}>
          {comment.replies.map(child => (
            <CommentNode
              key={child.id}
              comment={child}
              reactions={reactions}
              viewerId={viewerId}
              viewerIsAuthor={viewerIsAuthor}
              isSignedIn={isSignedIn}
              onReply={onReply}
              onToggleReaction={onToggleReaction}
              canDelete={canDelete}
              onDelete={onDelete}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </article>
  )
}

export default function CommentTree({
  tree,
  reactions,
  viewerId,
  viewerIsAuthor = false,
  isSignedIn,
  onReply,
  onToggleReaction,
  canDelete,
  onDelete,
  emptyLabel = 'No comments yet.',
}) {
  if (!tree?.length) {
    return (
      <p className="font-ui text-[0.85rem] text-choc-soft italic" data-comment-ui="">
        {emptyLabel}
      </p>
    )
  }

  return (
    <div
      className="comment-tree-scroll max-h-[min(70vh,32rem)] overflow-auto"
      data-comment-ui=""
    >
      <div className="min-w-[16rem] space-y-3 pr-1">
        {tree.map(comment => (
          <CommentNode
            key={comment.id}
            comment={comment}
            reactions={reactions}
            viewerId={viewerId}
            viewerIsAuthor={viewerIsAuthor}
            isSignedIn={isSignedIn}
            onReply={onReply}
            onToggleReaction={onToggleReaction}
            canDelete={canDelete}
            onDelete={onDelete}
          />
        ))}
      </div>
    </div>
  )
}

export { AuthorAvatar }
