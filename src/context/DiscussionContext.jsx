/*
  context/DiscussionContext.jsx

  Shared discussion state for inline threads, article comments, and reactions,
  backed by Supabase (see src/lib/discussions.js).

  Mutations are optimistic: the normalized in-memory store updates immediately
  with a real UUID, the matching row is written to Supabase in the background,
  and a failed write triggers a refresh to reconcile. Comments and reactions
  both require a signed-in Supabase user.
*/

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { useAuth } from './AuthContext'
import {
  addComment as buildComment,
  createInlineThread as buildThread,
  deleteComment as buildDelete,
  getPostDiscussion,
  toggleReaction as buildToggle,
} from '../data/discussions'
import {
  deleteComments,
  deleteReaction,
  emptyStore,
  fetchDiscussionStore,
  insertComment,
  insertReaction,
  insertThread,
} from '../lib/discussions'
import { findMatchingThread } from '../utils/commentAnchors'

const DiscussionContext = createContext(null)

function authorSnapshot(user, isAuthor) {
  if (!user) return null
  // Match the Supabase mapping: public identity is display name, not email.
  return {
    id: user.id,
    displayName: user.displayName || user.email || 'Reader',
    email: '',
    avatarUrl: user.avatarUrl || '',
    isAuthor: Boolean(isAuthor),
  }
}

export function DiscussionProvider({ children }) {
  const { isSignedIn, isAuthor, user } = useAuth()
  const [store, setStore] = useState(emptyStore)

  const refresh = useCallback(async () => {
    try {
      const remote = await fetchDiscussionStore()
      setStore(remote)
      return remote
    } catch (err) {
      console.warn('Failed to load discussions from Supabase', err)
      return null
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const remote = await fetchDiscussionStore()
        if (!cancelled) setStore(remote)
      } catch (err) {
        console.warn('Failed to load discussions from Supabase', err)
      }
    }

    load()

    function onFocus() {
      if (document.visibilityState === 'visible') load()
    }

    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onFocus)
    return () => {
      cancelled = true
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onFocus)
    }
  }, [])

  // Fire a Supabase write in the background; reconcile from server on failure.
  const applyWrite = useCallback((factory) => {
    Promise.resolve()
      .then(factory)
      .catch((err) => {
        console.warn('Failed to sync discussion change to Supabase', err)
        refresh()
      })
  }, [refresh])

  const viewerId = isSignedIn && user?.id ? user.id : null

  const getDiscussionForPost = useCallback((postId) => (
    getPostDiscussion(store, postId)
  ), [store])

  const createInlineThreadWithComment = useCallback(({ postId, anchor, text }) => {
    if (!isSignedIn || !user) {
      return { ok: false, reason: 'auth_required' }
    }
    const author = authorSnapshot(user, isAuthor)
    let next = store
    const discussion = getPostDiscussion(next, postId)
    let thread = findMatchingThread(discussion.inlineThreads, postId, anchor)
    let createdThread = null

    if (!thread) {
      const created = buildThread(next, { postId, anchor })
      if (!created.thread) return { ok: false, reason: 'invalid_thread' }
      next = created.store
      thread = created.thread
      createdThread = created.thread
    }

    const commented = buildComment(next, {
      postId,
      scope: 'inline',
      threadId: thread.id,
      parentId: null,
      text,
      author,
    })
    if (!commented.comment) return { ok: false, reason: 'invalid_comment' }

    setStore(commented.store)
    const comment = commented.comment
    applyWrite(async () => {
      if (createdThread) {
        await insertThread({ id: createdThread.id, postId, anchor: createdThread.anchor })
      }
      await insertComment({
        id: comment.id,
        postId,
        scope: 'inline',
        threadId: thread.id,
        parentId: null,
        text: comment.text,
        authorId: user.id,
      })
    })

    return { ok: true, thread, comment }
  }, [isSignedIn, user, isAuthor, store, applyWrite])

  const createInlineReaction = useCallback(({ postId, anchor, emoji }) => {
    if (!isSignedIn || !user || !viewerId) {
      return { ok: false, reason: 'auth_required' }
    }
    let next = store
    const discussion = getPostDiscussion(next, postId)
    let thread = findMatchingThread(discussion.inlineThreads, postId, anchor)
    let createdThread = null

    if (!thread) {
      const created = buildThread(next, { postId, anchor })
      if (!created.thread) return { ok: false, reason: 'invalid_thread' }
      next = created.store
      thread = created.thread
      createdThread = created.thread
    }

    const author = authorSnapshot(user, isAuthor)
    const toggled = buildToggle(next, {
      targetType: 'excerpt',
      targetId: thread.id,
      emoji,
      viewerId,
      author,
    })
    if (!toggled.reaction && !toggled.removed) {
      return { ok: false, reason: 'invalid_reaction' }
    }

    setStore(toggled.store)
    const { reaction, removed } = toggled
    applyWrite(async () => {
      if (createdThread) {
        await insertThread({ id: createdThread.id, postId, anchor: createdThread.anchor })
      }
      if (removed) {
        await deleteReaction(reaction.id)
      } else {
        await insertReaction({
          id: reaction.id,
          targetType: 'excerpt',
          targetId: thread.id,
          emoji,
          viewerId,
        })
      }
    })

    return { ok: true, thread, reaction, removed }
  }, [store, viewerId, applyWrite, isSignedIn, user, isAuthor])

  const toggleExcerptReaction = useCallback(({ threadId, emoji }) => {
    if (!isSignedIn || !user || !viewerId) {
      return { ok: false, reason: 'auth_required' }
    }
    const author = authorSnapshot(user, isAuthor)
    const toggled = buildToggle(store, {
      targetType: 'excerpt',
      targetId: threadId,
      emoji,
      viewerId,
      author,
    })
    if (!toggled.reaction && !toggled.removed) {
      return { ok: false, reason: 'invalid_reaction' }
    }

    setStore(toggled.store)
    const { reaction, removed } = toggled
    applyWrite(async () => {
      if (removed) {
        await deleteReaction(reaction.id)
      } else {
        await insertReaction({
          id: reaction.id,
          targetType: 'excerpt',
          targetId: threadId,
          emoji,
          viewerId,
        })
      }
    })

    return { ok: true, reaction, removed }
  }, [store, viewerId, applyWrite, isSignedIn, user, isAuthor])

  const addArticleComment = useCallback(({ postId, text, parentId = null }) => {
    if (!isSignedIn || !user) {
      return { ok: false, reason: 'auth_required' }
    }
    const author = authorSnapshot(user, isAuthor)
    const commented = buildComment(store, {
      postId,
      scope: 'article',
      threadId: null,
      parentId,
      text,
      author,
    })
    if (!commented.comment) return { ok: false, reason: 'invalid_comment' }

    setStore(commented.store)
    const comment = commented.comment
    applyWrite(async () => {
      await insertComment({
        id: comment.id,
        postId,
        scope: 'article',
        threadId: null,
        parentId: parentId ?? null,
        text: comment.text,
        authorId: user.id,
      })
    })

    return { ok: true, comment }
  }, [isSignedIn, user, isAuthor, store, applyWrite])

  const addInlineReply = useCallback(({ postId, threadId, text, parentId }) => {
    if (!isSignedIn || !user) {
      return { ok: false, reason: 'auth_required' }
    }
    const author = authorSnapshot(user, isAuthor)
    const commented = buildComment(store, {
      postId,
      scope: 'inline',
      threadId,
      parentId,
      text,
      author,
    })
    if (!commented.comment) return { ok: false, reason: 'invalid_comment' }

    setStore(commented.store)
    const comment = commented.comment
    applyWrite(async () => {
      await insertComment({
        id: comment.id,
        postId,
        scope: 'inline',
        threadId,
        parentId: parentId ?? null,
        text: comment.text,
        authorId: user.id,
      })
    })

    return { ok: true, comment }
  }, [isSignedIn, user, isAuthor, store, applyWrite])

  const canDeleteComment = useCallback((comment) => {
    if (!isSignedIn || !user || !comment) return false
    if (isAuthor) return true
    return comment.author?.id === user.id
  }, [isSignedIn, user, isAuthor])

  const deleteComment = useCallback(({ commentId }) => {
    const comment = store.comments[commentId]
    if (!comment) return { ok: false, reason: 'not_found' }
    if (!canDeleteComment(comment)) return { ok: false, reason: 'forbidden' }

    const before = new Set(Object.keys(store.comments))
    const result = buildDelete(store, { commentId })
    if (!result.removed) return { ok: false, reason: 'not_found' }
    const removedIds = [...before].filter(id => !result.store.comments[id])

    setStore(result.store)
    applyWrite(async () => {
      await deleteComments(removedIds)
    })

    return { ok: true }
  }, [store, canDeleteComment, applyWrite])

  const toggleCommentReaction = useCallback(({ commentId, emoji }) => {
    if (!isSignedIn || !user || !viewerId) {
      return { ok: false, reason: 'auth_required' }
    }
    const author = authorSnapshot(user, isAuthor)
    const toggled = buildToggle(store, {
      targetType: 'comment',
      targetId: commentId,
      emoji,
      viewerId,
      author,
    })
    if (!toggled.reaction && !toggled.removed) {
      return { ok: false, reason: 'invalid_reaction' }
    }

    setStore(toggled.store)
    const { reaction, removed } = toggled
    applyWrite(async () => {
      if (removed) {
        await deleteReaction(reaction.id)
      } else {
        await insertReaction({
          id: reaction.id,
          targetType: 'comment',
          targetId: commentId,
          emoji,
          viewerId,
        })
      }
    })

    return { ok: true, reaction, removed }
  }, [store, viewerId, applyWrite, isSignedIn, user, isAuthor])

  const value = useMemo(() => ({
    store,
    viewerId,
    isSignedIn: Boolean(isSignedIn),
    refresh,
    getDiscussionForPost,
    createInlineThreadWithComment,
    createInlineReaction,
    toggleExcerptReaction,
    addArticleComment,
    addInlineReply,
    toggleCommentReaction,
    canDeleteComment,
    deleteComment,
  }), [
    store,
    viewerId,
    isSignedIn,
    refresh,
    getDiscussionForPost,
    createInlineThreadWithComment,
    createInlineReaction,
    toggleExcerptReaction,
    addArticleComment,
    addInlineReply,
    toggleCommentReaction,
    canDeleteComment,
    deleteComment,
  ])

  return (
    <DiscussionContext.Provider value={value}>
      {children}
    </DiscussionContext.Provider>
  )
}

export function useDiscussion() {
  const ctx = useContext(DiscussionContext)
  if (!ctx) throw new Error('useDiscussion must be used inside <DiscussionProvider>')
  return ctx
}
