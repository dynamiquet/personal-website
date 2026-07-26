/*
  data/discussions.js — discussion store + helpers.

  Versioned, normalized store for inline threads, comments, and reactions.
  Dev persistence: fetchStore / pushStore → Vite /api/discussions → data/discussions.json.
  loadStore / saveStore remain for tests and guest-id localStorage helpers.
*/

export const STORAGE_KEY = 'dt_discussions_v1'
export const STORE_VERSION = 1

export const REACTION_EMOJIS = [
  { id: 'insightful', emoji: '💡', label: 'Insightful' },
  { id: 'pondering', emoji: '🤔', label: 'Pondering' },
  { id: 'loved', emoji: '❤️', label: 'Loved this' },
  { id: 'agree', emoji: '👍', label: 'Agree' },
  { id: 'funny', emoji: '😂', label: 'Funny' },
  { id: 'wow', emoji: '😮', label: 'Wow' },
  { id: 'sad', emoji: '😢', label: 'Sad' },
  { id: 'fire', emoji: '🔥', label: 'Fire' },
  { id: 'applause', emoji: '👏', label: 'Applause' },
  { id: 'grateful', emoji: '🙏', label: 'Grateful' },
  { id: 'hundred', emoji: '💯', label: 'Hundred' },
  { id: 'eyes', emoji: '👀', label: 'Eyes on this' },
]

export const REACTION_IDS = REACTION_EMOJIS.map(r => r.id)

const GUEST_ID_KEY = 'dt_discussion_guest_id'

function emptyStore() {
  return {
    version: STORE_VERSION,
    inlineThreads: {},
    comments: {},
    reactions: {},
  }
}

export function createId(prefix = 'id') {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return `${prefix}_${crypto.randomUUID()}`
  }
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`
}

export function nowIso() {
  return new Date().toISOString()
}

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function isValidAnchor(anchor) {
  if (!isPlainObject(anchor)) return false
  const { start, end, quote, prefix, suffix, bodyFingerprint } = anchor
  return (
    Number.isInteger(start)
    && Number.isInteger(end)
    && start >= 0
    && end > start
    && typeof quote === 'string'
    && typeof prefix === 'string'
    && typeof suffix === 'string'
    && typeof bodyFingerprint === 'string'
  )
}

function sanitizeAuthor(author) {
  if (!isPlainObject(author) || typeof author.id !== 'string' || !author.id) {
    return null
  }
  const email = typeof author.email === 'string' ? author.email.trim() : ''
  return {
    id: author.id,
    displayName: typeof author.displayName === 'string' && author.displayName.trim()
      ? author.displayName.trim()
      : (email || 'Reader'),
    email,
    avatarUrl: typeof author.avatarUrl === 'string' ? author.avatarUrl : '',
    isAuthor: Boolean(author.isAuthor),
  }
}

function sanitizeInlineThread(thread) {
  if (!isPlainObject(thread)) return null
  if (typeof thread.id !== 'string' || !thread.id) return null
  if (typeof thread.postId !== 'string' || !thread.postId) return null
  if (!isValidAnchor(thread.anchor)) return null
  return {
    id: thread.id,
    postId: thread.postId,
    scope: 'inline',
    anchor: {
      start: thread.anchor.start,
      end: thread.anchor.end,
      quote: thread.anchor.quote,
      prefix: thread.anchor.prefix,
      suffix: thread.anchor.suffix,
      bodyFingerprint: thread.anchor.bodyFingerprint,
    },
    createdAt: typeof thread.createdAt === 'string' ? thread.createdAt : nowIso(),
    updatedAt: typeof thread.updatedAt === 'string' ? thread.updatedAt : nowIso(),
  }
}

function sanitizeComment(comment) {
  if (!isPlainObject(comment)) return null
  if (typeof comment.id !== 'string' || !comment.id) return null
  if (typeof comment.postId !== 'string' || !comment.postId) return null
  if (comment.scope !== 'inline' && comment.scope !== 'article') return null
  if (typeof comment.text !== 'string') return null
  const text = comment.text.trim()
  if (!text) return null
  const author = sanitizeAuthor(comment.author)
  if (!author) return null

  const threadId = comment.threadId == null ? null : String(comment.threadId)
  const parentId = comment.parentId == null ? null : String(comment.parentId)

  if (comment.scope === 'inline' && !threadId) return null

  return {
    id: comment.id,
    postId: comment.postId,
    threadId,
    parentId,
    scope: comment.scope,
    text,
    author,
    createdAt: typeof comment.createdAt === 'string' ? comment.createdAt : nowIso(),
    updatedAt: typeof comment.updatedAt === 'string' ? comment.updatedAt : nowIso(),
  }
}

function sanitizeReaction(reaction) {
  if (!isPlainObject(reaction)) return null
  if (typeof reaction.id !== 'string' || !reaction.id) return null
  if (reaction.targetType !== 'excerpt' && reaction.targetType !== 'comment') return null
  if (typeof reaction.targetId !== 'string' || !reaction.targetId) return null
  if (!REACTION_IDS.includes(reaction.emoji)) return null
  if (typeof reaction.viewerId !== 'string' || !reaction.viewerId) return null
  const author = sanitizeAuthor(reaction.author)
  return {
    id: reaction.id,
    targetType: reaction.targetType,
    targetId: reaction.targetId,
    emoji: reaction.emoji,
    viewerId: reaction.viewerId,
    author: author || null,
    createdAt: typeof reaction.createdAt === 'string' ? reaction.createdAt : nowIso(),
  }
}

export function normalizeStore(raw) {
  if (!isPlainObject(raw) || raw.version !== STORE_VERSION) {
    return emptyStore()
  }

  const next = emptyStore()

  if (isPlainObject(raw.inlineThreads)) {
    for (const value of Object.values(raw.inlineThreads)) {
      const thread = sanitizeInlineThread(value)
      if (thread) next.inlineThreads[thread.id] = thread
    }
  }

  if (isPlainObject(raw.comments)) {
    for (const value of Object.values(raw.comments)) {
      const comment = sanitizeComment(value)
      if (comment) next.comments[comment.id] = comment
    }
  }

  if (isPlainObject(raw.reactions)) {
    for (const value of Object.values(raw.reactions)) {
      const reaction = sanitizeReaction(value)
      if (reaction) next.reactions[reaction.id] = reaction
    }
  }

  return next
}

export function loadStore(storage = globalThis.localStorage) {
  if (!storage) return emptyStore()
  try {
    const raw = storage.getItem(STORAGE_KEY)
    if (!raw) return emptyStore()
    return normalizeStore(JSON.parse(raw))
  } catch {
    return emptyStore()
  }
}

export function saveStore(store, storage = globalThis.localStorage) {
  if (!storage) return
  const normalized = normalizeStore(store)
  storage.setItem(STORAGE_KEY, JSON.stringify(normalized))
  return normalized
}

const DISCUSSIONS_API = '/api/discussions'

export async function fetchStore() {
  try {
    const res = await fetch(DISCUSSIONS_API, { cache: 'no-store' })
    if (!res.ok) return emptyStore()
    return normalizeStore(await res.json())
  } catch {
    return emptyStore()
  }
}

export async function pushStore(store) {
  const normalized = normalizeStore(store)
  const res = await fetch(DISCUSSIONS_API, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(normalized),
  })
  if (!res.ok) throw new Error('Failed to save discussions')
  try {
    return normalizeStore(await res.json())
  } catch {
    return normalized
  }
}

export function getOrCreateGuestId(storage = globalThis.localStorage) {
  if (!storage) return createId('guest')
  try {
    const existing = storage.getItem(GUEST_ID_KEY)
    if (existing && typeof existing === 'string' && existing.trim()) {
      return existing.trim()
    }
    const id = createId('guest')
    storage.setItem(GUEST_ID_KEY, id)
    return id
  } catch {
    return createId('guest')
  }
}

export function createInlineThread(store, { postId, anchor }) {
  const thread = sanitizeInlineThread({
    id: createId('thread'),
    postId,
    anchor,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  })
  if (!thread) return { store, thread: null }

  return {
    store: {
      ...store,
      inlineThreads: {
        ...store.inlineThreads,
        [thread.id]: thread,
      },
    },
    thread,
  }
}

export function addComment(store, {
  postId,
  scope,
  text,
  author,
  threadId = null,
  parentId = null,
}) {
  const comment = sanitizeComment({
    id: createId('comment'),
    postId,
    scope,
    text,
    author,
    threadId,
    parentId,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  })
  if (!comment) return { store, comment: null }

  if (parentId && !store.comments[parentId]) {
    return { store, comment: null }
  }
  if (scope === 'inline' && (!threadId || !store.inlineThreads[threadId])) {
    return { store, comment: null }
  }

  return {
    store: {
      ...store,
      comments: {
        ...store.comments,
        [comment.id]: comment,
      },
    },
    comment,
  }
}

export function toggleReaction(store, {
  targetType,
  targetId,
  emoji,
  viewerId,
  author = null,
}) {
  if (!REACTION_IDS.includes(emoji)) return { store, reaction: null, removed: false }
  if (!viewerId || !targetId) return { store, reaction: null, removed: false }

  if (targetType === 'excerpt' && !store.inlineThreads[targetId]) {
    return { store, reaction: null, removed: false }
  }
  if (targetType === 'comment' && !store.comments[targetId]) {
    return { store, reaction: null, removed: false }
  }

  const existing = Object.values(store.reactions).find(r => (
    r.targetType === targetType
    && r.targetId === targetId
    && r.emoji === emoji
    && r.viewerId === viewerId
  ))

  if (existing) {
    const { [existing.id]: _removed, ...rest } = store.reactions
    return {
      store: { ...store, reactions: rest },
      reaction: existing,
      removed: true,
    }
  }

  const reaction = sanitizeReaction({
    id: createId('reaction'),
    targetType,
    targetId,
    emoji,
    viewerId,
    author,
    createdAt: nowIso(),
  })
  if (!reaction) return { store, reaction: null, removed: false }

  return {
    store: {
      ...store,
      reactions: {
        ...store.reactions,
        [reaction.id]: reaction,
      },
    },
    reaction,
    removed: false,
  }
}

export function deleteComment(store, { commentId }) {
  const target = store.comments[commentId]
  if (!target) return { store, removed: false }

  // Collect the comment plus all of its descendant replies.
  const toRemove = new Set([commentId])
  let grew = true
  while (grew) {
    grew = false
    for (const c of Object.values(store.comments)) {
      if (c.parentId && toRemove.has(c.parentId) && !toRemove.has(c.id)) {
        toRemove.add(c.id)
        grew = true
      }
    }
  }

  const comments = {}
  for (const [cid, c] of Object.entries(store.comments)) {
    if (!toRemove.has(cid)) comments[cid] = c
  }

  const reactions = {}
  for (const [rid, r] of Object.entries(store.reactions)) {
    if (r.targetType === 'comment' && toRemove.has(r.targetId)) continue
    reactions[rid] = r
  }

  // Drop the inline thread (and its highlight) if nothing references it anymore.
  let inlineThreads = store.inlineThreads
  if (target.scope === 'inline' && target.threadId) {
    const stillHasComments = Object.values(comments)
      .some(c => c.threadId === target.threadId)
    const stillHasReactions = Object.values(reactions)
      .some(r => r.targetType === 'excerpt' && r.targetId === target.threadId)
    if (!stillHasComments && !stillHasReactions) {
      const { [target.threadId]: _thread, ...rest } = store.inlineThreads
      inlineThreads = rest
    }
  }

  return {
    store: { ...store, comments, reactions, inlineThreads },
    removed: true,
  }
}

export function reactionEmojiGlyph(emojiId) {
  return REACTION_EMOJIS.find(r => r.id === emojiId)?.emoji ?? ''
}

export function reactionAuthorLabel(reaction) {
  const author = reaction?.author
  if (!author) return 'Guest'
  return author.email || author.displayName || 'Reader'
}

export function getPostDiscussion(store, postId) {
  const inlineThreads = Object.values(store.inlineThreads)
    .filter(t => t.postId === postId)
    .sort((a, b) => a.anchor.start - b.anchor.start || a.createdAt.localeCompare(b.createdAt))

  const comments = Object.values(store.comments)
    .filter(c => c.postId === postId)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))

  const threadIds = new Set(inlineThreads.map(t => t.id))
  const commentIds = new Set(comments.map(c => c.id))

  const reactions = Object.values(store.reactions).filter(r => {
    if (r.targetType === 'excerpt') return threadIds.has(r.targetId)
    return commentIds.has(r.targetId)
  })

  return { inlineThreads, comments, reactions }
}

export function summarizeReactions(reactions, viewerId) {
  const summary = {}
  for (const def of REACTION_EMOJIS) {
    summary[def.id] = {
      ...def,
      count: 0,
      reactedByViewer: false,
    }
  }
  for (const reaction of reactions) {
    const bucket = summary[reaction.emoji]
    if (!bucket) continue
    bucket.count += 1
    if (viewerId && reaction.viewerId === viewerId) {
      bucket.reactedByViewer = true
    }
  }
  return REACTION_EMOJIS.map(def => summary[def.id])
}

export function buildCommentTree(comments, { threadId = undefined, scope = undefined } = {}) {
  const filtered = comments.filter(c => {
    if (scope && c.scope !== scope) return false
    if (threadId !== undefined && c.threadId !== threadId) return false
    return true
  })

  const byParent = new Map()
  for (const comment of filtered) {
    const key = comment.parentId ?? null
    if (!byParent.has(key)) byParent.set(key, [])
    byParent.get(key).push(comment)
  }

  function walk(parentId) {
    const children = byParent.get(parentId) ?? []
    return children.map(comment => ({
      ...comment,
      replies: walk(comment.id),
    }))
  }

  return walk(null)
}
