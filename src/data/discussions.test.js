import { describe, expect, it, beforeEach } from 'vitest'
import {
  STORAGE_KEY,
  addComment,
  buildCommentTree,
  createInlineThread,
  getPostDiscussion,
  loadStore,
  normalizeStore,
  saveStore,
  summarizeReactions,
  toggleReaction,
} from './discussions.js'

function memoryStorage(initial = {}) {
  const map = new Map(Object.entries(initial))
  return {
    getItem(key) {
      return map.has(key) ? map.get(key) : null
    },
    setItem(key, value) {
      map.set(key, String(value))
    },
    removeItem(key) {
      map.delete(key)
    },
  }
}

const sampleAnchor = {
  start: 10,
  end: 24,
  quote: 'hello world text',
  prefix: 'before ',
  suffix: ' after',
  bodyFingerprint: 'fp1',
}

const author = {
  id: 'user_1',
  displayName: 'Ada',
  avatarUrl: '',
  isAuthor: false,
}

describe('discussions store', () => {
  let storage

  beforeEach(() => {
    storage = memoryStorage()
  })

  it('loads an empty store when missing', () => {
    expect(loadStore(storage)).toEqual({
      version: 1,
      inlineThreads: {},
      comments: {},
      reactions: {},
    })
  })

  it('recovers from malformed JSON without throwing', () => {
    storage.setItem(STORAGE_KEY, '{not-json')
    expect(loadStore(storage).version).toBe(1)
    expect(Object.keys(loadStore(storage).inlineThreads)).toHaveLength(0)
  })

  it('rejects wrong version and corrupt records', () => {
    const normalized = normalizeStore({
      version: 99,
      inlineThreads: { bad: { id: 'x' } },
      comments: {},
      reactions: {},
    })
    expect(normalized).toEqual({
      version: 1,
      inlineThreads: {},
      comments: {},
      reactions: {},
    })
  })

  it('creates inline threads, comments, and nested replies', () => {
    let store = loadStore(storage)
    const created = createInlineThread(store, {
      postId: 'p1',
      anchor: sampleAnchor,
    })
    store = created.store

    const top = addComment(store, {
      postId: 'p1',
      scope: 'inline',
      threadId: created.thread.id,
      text: 'Top comment',
      author,
    })
    store = top.store

    const reply = addComment(store, {
      postId: 'p1',
      scope: 'inline',
      threadId: created.thread.id,
      parentId: top.comment.id,
      text: 'Nested reply',
      author: { ...author, id: 'user_2', displayName: 'Bee', isAuthor: true },
    })
    store = reply.store

    saveStore(store, storage)
    const reloaded = loadStore(storage)
    const discussion = getPostDiscussion(reloaded, 'p1')

    expect(discussion.inlineThreads).toHaveLength(1)
    expect(discussion.comments).toHaveLength(2)

    const tree = buildCommentTree(discussion.comments, {
      threadId: created.thread.id,
      scope: 'inline',
    })
    expect(tree).toHaveLength(1)
    expect(tree[0].replies).toHaveLength(1)
    expect(tree[0].replies[0].text).toBe('Nested reply')
    expect(tree[0].replies[0].author.isAuthor).toBe(true)
  })

  it('toggles one reaction per viewer and isolates posts', () => {
    let store = loadStore(storage)
    const t1 = createInlineThread(store, { postId: 'p1', anchor: sampleAnchor })
    store = t1.store
    const t2 = createInlineThread(store, {
      postId: 'p2',
      anchor: { ...sampleAnchor, bodyFingerprint: 'fp2' },
    })
    store = t2.store

    const first = toggleReaction(store, {
      targetType: 'excerpt',
      targetId: t1.thread.id,
      emoji: 'loved',
      viewerId: 'guest_a',
    })
    store = first.store
    expect(first.removed).toBe(false)
    expect(Object.keys(store.reactions)).toHaveLength(1)

    const second = toggleReaction(store, {
      targetType: 'excerpt',
      targetId: t1.thread.id,
      emoji: 'loved',
      viewerId: 'guest_a',
    })
    store = second.store
    expect(second.removed).toBe(true)
    expect(Object.keys(store.reactions)).toHaveLength(0)

    store = toggleReaction(store, {
      targetType: 'excerpt',
      targetId: t2.thread.id,
      emoji: 'insightful',
      viewerId: 'guest_a',
    }).store

    const p1 = getPostDiscussion(store, 'p1')
    const p2 = getPostDiscussion(store, 'p2')
    expect(p1.reactions).toHaveLength(0)
    expect(p2.reactions).toHaveLength(1)

    const summary = summarizeReactions(p2.reactions, 'guest_a')
    expect(summary.find(r => r.id === 'insightful')).toMatchObject({
      count: 1,
      reactedByViewer: true,
    })
  })

  it('supports article-scope comments without a thread', () => {
    let store = loadStore(storage)
    const top = addComment(store, {
      postId: 'p1',
      scope: 'article',
      text: 'General thought',
      author,
    })
    store = top.store
    const reply = addComment(store, {
      postId: 'p1',
      scope: 'article',
      parentId: top.comment.id,
      text: 'Agree',
      author,
    })
    store = reply.store

    const discussion = getPostDiscussion(store, 'p1')
    const tree = buildCommentTree(discussion.comments, { scope: 'article' })
    expect(tree).toHaveLength(1)
    expect(tree[0].replies[0].text).toBe('Agree')
  })
})
