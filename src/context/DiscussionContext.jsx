/*
  context/DiscussionContext.jsx

  Shared discussion state for inline threads, article comments, and reactions.
  Dev persistence: shared JSON file via /api/discussions (see vite-plugin-discussions-api).
  Guest identity still lives in localStorage (per browser).
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
  addComment as addCommentToStore,
  createInlineThread as createInlineThreadInStore,
  deleteComment as deleteCommentFromStore,
  fetchStore,
  getOrCreateGuestId,
  getPostDiscussion,
  normalizeStore,
  pushStore,
  toggleReaction as toggleReactionInStore,
} from '../data/discussions'
import { findMatchingThread } from '../utils/commentAnchors'

const DiscussionContext = createContext(null)

function emptyStore() {
  return normalizeStore({ version: 1 })
}

function authorSnapshot(user, isAuthor) {
  if (!user) return null
  const email = user.primaryEmailAddress?.emailAddress || ''
  const displayName = (
    email
    || user.fullName
    || user.username
    || 'Reader'
  )
  return {
    id: user.id,
    displayName,
    email,
    avatarUrl: user.imageUrl || '',
    isAuthor: Boolean(isAuthor),
  }
}

export function DiscussionProvider({ children, storage }) {
  const { isSignedIn, isAuthor, user } = useAuth()
  const [store, setStore] = useState(emptyStore)
  const [guestId] = useState(() => getOrCreateGuestId(storage))

  const refresh = useCallback(async () => {
    const remote = await fetchStore()
    setStore(remote)
    return remote
  }, [])

  useEffect(() => {
    let cancelled = false

    async function load() {
      const remote = await fetchStore()
      if (!cancelled) setStore(remote)
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

  const persist = useCallback((next) => {
    const normalized = normalizeStore(next)
    setStore(normalized)
    pushStore(normalized).catch((err) => {
      console.warn('Failed to persist discussions to shared JSON', err)
    })
    return normalized
  }, [])

  const viewerId = isSignedIn && user?.id ? user.id : guestId

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

    if (!thread) {
      const created = createInlineThreadInStore(next, { postId, anchor })
      if (!created.thread) return { ok: false, reason: 'invalid_thread' }
      next = created.store
      thread = created.thread
    }

    const commented = addCommentToStore(next, {
      postId,
      scope: 'inline',
      threadId: thread.id,
      parentId: null,
      text,
      author,
    })
    if (!commented.comment) return { ok: false, reason: 'invalid_comment' }

    persist(commented.store)
    return {
      ok: true,
      thread,
      comment: commented.comment,
    }
  }, [isSignedIn, user, isAuthor, store, persist])

  const createInlineReaction = useCallback(({ postId, anchor, emoji }) => {
    let next = store
    const discussion = getPostDiscussion(next, postId)
    let thread = findMatchingThread(discussion.inlineThreads, postId, anchor)

    if (!thread) {
      const created = createInlineThreadInStore(next, { postId, anchor })
      if (!created.thread) return { ok: false, reason: 'invalid_thread' }
      next = created.store
      thread = created.thread
    }

    const author = isSignedIn && user ? authorSnapshot(user, isAuthor) : null
    const toggled = toggleReactionInStore(next, {
      targetType: 'excerpt',
      targetId: thread.id,
      emoji,
      viewerId,
      author,
    })
    if (!toggled.reaction && !toggled.removed) {
      return { ok: false, reason: 'invalid_reaction' }
    }

    persist(toggled.store)
    return {
      ok: true,
      thread,
      reaction: toggled.reaction,
      removed: toggled.removed,
    }
  }, [store, viewerId, persist, isSignedIn, user, isAuthor])

  const toggleExcerptReaction = useCallback(({ threadId, emoji }) => {
    const author = isSignedIn && user ? authorSnapshot(user, isAuthor) : null
    const toggled = toggleReactionInStore(store, {
      targetType: 'excerpt',
      targetId: threadId,
      emoji,
      viewerId,
      author,
    })
    if (!toggled.reaction && !toggled.removed) {
      return { ok: false, reason: 'invalid_reaction' }
    }
    persist(toggled.store)
    return {
      ok: true,
      reaction: toggled.reaction,
      removed: toggled.removed,
    }
  }, [store, viewerId, persist, isSignedIn, user, isAuthor])

  const addArticleComment = useCallback(({ postId, text, parentId = null }) => {
    if (!isSignedIn || !user) {
      return { ok: false, reason: 'auth_required' }
    }
    const author = authorSnapshot(user, isAuthor)
    const commented = addCommentToStore(store, {
      postId,
      scope: 'article',
      threadId: null,
      parentId,
      text,
      author,
    })
    if (!commented.comment) return { ok: false, reason: 'invalid_comment' }
    persist(commented.store)
    return { ok: true, comment: commented.comment }
  }, [isSignedIn, user, isAuthor, store, persist])

  const addInlineReply = useCallback(({ postId, threadId, text, parentId }) => {
    if (!isSignedIn || !user) {
      return { ok: false, reason: 'auth_required' }
    }
    const author = authorSnapshot(user, isAuthor)
    const commented = addCommentToStore(store, {
      postId,
      scope: 'inline',
      threadId,
      parentId,
      text,
      author,
    })
    if (!commented.comment) return { ok: false, reason: 'invalid_comment' }
    persist(commented.store)
    return { ok: true, comment: commented.comment }
  }, [isSignedIn, user, isAuthor, store, persist])

  const canDeleteComment = useCallback((comment) => {
    if (!isSignedIn || !user || !comment) return false
    if (isAuthor) return true
    return comment.author?.id === user.id
  }, [isSignedIn, user, isAuthor])

  const deleteComment = useCallback(({ commentId }) => {
    const comment = store.comments[commentId]
    if (!comment) return { ok: false, reason: 'not_found' }
    if (!canDeleteComment(comment)) return { ok: false, reason: 'forbidden' }
    const result = deleteCommentFromStore(store, { commentId })
    if (!result.removed) return { ok: false, reason: 'not_found' }
    persist(result.store)
    return { ok: true }
  }, [store, canDeleteComment, persist])

  const toggleCommentReaction = useCallback(({ commentId, emoji }) => {
    const author = isSignedIn && user ? authorSnapshot(user, isAuthor) : null
    const toggled = toggleReactionInStore(store, {
      targetType: 'comment',
      targetId: commentId,
      emoji,
      viewerId,
      author,
    })
    if (!toggled.reaction && !toggled.removed) {
      return { ok: false, reason: 'invalid_reaction' }
    }
    persist(toggled.store)
    return {
      ok: true,
      reaction: toggled.reaction,
      removed: toggled.removed,
    }
  }, [store, viewerId, persist, isSignedIn, user, isAuthor])

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
