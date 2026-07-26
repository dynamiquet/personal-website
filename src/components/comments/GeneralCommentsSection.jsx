/*
  components/comments/GeneralCommentsSection.jsx
*/

import CommentComposer from './CommentComposer'
import CommentTree from './CommentTree'
import { buildCommentTree } from '../../data/discussions'

export default function GeneralCommentsSection({
  comments,
  reactions,
  viewerId,
  viewerIsAuthor = false,
  isSignedIn,
  onAddComment,
  onReply,
  onToggleCommentReaction,
  canDeleteComment,
  onDeleteComment,
}) {
  const tree = buildCommentTree(comments ?? [], { scope: 'article' })

  return (
    <section
      className="mt-14 border-t border-white/15 pt-8"
      aria-labelledby="general-comments-heading"
      data-comment-ui=""
    >
      <h2
        id="general-comments-heading"
        className="mb-1 font-display text-[1.35rem] font-medium text-choc-text"
      >
        Discussion
      </h2>
      <p className="mb-5 font-ui text-[0.85rem] text-choc-soft">
        Share thoughts about the essay as a whole.
      </p>

      <div className="mb-6">
        <CommentComposer
          isSignedIn={isSignedIn}
          placeholder="Write a general comment…"
          onSubmit={text => onAddComment?.(text)}
        />
      </div>

      <CommentTree
        tree={tree}
        reactions={reactions}
        viewerId={viewerId}
        viewerIsAuthor={viewerIsAuthor}
        isSignedIn={isSignedIn}
        emptyLabel="No discussion yet. Start the conversation."
        onToggleReaction={onToggleCommentReaction}
        onReply={(parentId, text) => onReply?.(parentId, text)}
        canDelete={canDeleteComment}
        onDelete={onDeleteComment}
      />
    </section>
  )
}
