/*
  Supabase persistence for discussions (inline threads, comments, reactions).

  The app keeps the normalized in-memory store shape from data/discussions.js;
  this module loads that shape from Supabase and writes individual rows.
  Author identity is resolved from public.profiles (display_name / role); email
  is intentionally not exposed for other readers.
*/

import { supabase } from './supabase'

const AUTHOR_SELECT = 'id, display_name, avatar_url, role'

function rowToAuthor(profile) {
  if (!profile) return null
  return {
    id: profile.id,
    displayName: profile.display_name || 'Reader',
    email: '',
    avatarUrl: profile.avatar_url || '',
    isAuthor: profile.role === 'author',
  }
}

// Selectors sort threads by anchor.start, so a malformed anchor would break the
// whole essay's discussion. Skip those rows instead.
function hasUsableAnchor(anchor) {
  return Boolean(
    anchor
    && typeof anchor === 'object'
    && Number.isInteger(anchor.start)
    && Number.isInteger(anchor.end),
  )
}

function rowToThread(row) {
  if (!hasUsableAnchor(row.anchor)) return null
  return {
    id: row.id,
    postId: row.post_id,
    scope: 'inline',
    anchor: row.anchor,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function rowToComment(row) {
  return {
    id: row.id,
    postId: row.post_id,
    threadId: row.thread_id ?? null,
    parentId: row.parent_id ?? null,
    scope: row.scope,
    text: row.text,
    author: rowToAuthor(row.author),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function rowToReaction(row) {
  return {
    id: row.id,
    targetType: row.target_type,
    targetId: row.target_id,
    emoji: row.emoji,
    viewerId: row.viewer_id,
    author: rowToAuthor(row.author),
    createdAt: row.created_at,
  }
}

export function emptyStore() {
  return { version: 1, inlineThreads: {}, comments: {}, reactions: {} }
}

export async function fetchDiscussionStore() {
  const [threads, comments, reactions] = await Promise.all([
    supabase
      .from('inline_threads')
      .select('id, post_id, anchor, created_at, updated_at'),
    supabase
      .from('comments')
      .select(`id, post_id, thread_id, parent_id, scope, text, created_at, updated_at, author:profiles!comments_author_id_fkey(${AUTHOR_SELECT})`),
    supabase
      .from('reactions')
      .select(`id, target_type, target_id, emoji, viewer_id, created_at, author:profiles!reactions_viewer_id_fkey(${AUTHOR_SELECT})`),
  ])

  if (threads.error) throw threads.error
  if (comments.error) throw comments.error
  if (reactions.error) throw reactions.error

  const store = emptyStore()
  for (const row of threads.data ?? []) {
    const thread = rowToThread(row)
    if (thread) store.inlineThreads[thread.id] = thread
  }
  for (const row of comments.data ?? []) {
    const comment = rowToComment(row)
    store.comments[comment.id] = comment
  }
  for (const row of reactions.data ?? []) {
    const reaction = rowToReaction(row)
    store.reactions[reaction.id] = reaction
  }
  return store
}

export async function insertThread({ id, postId, anchor }) {
  const { error } = await supabase
    .from('inline_threads')
    .insert({ id, post_id: postId, anchor })
  if (error) throw error
}

export async function insertComment({
  id,
  postId,
  scope,
  threadId = null,
  parentId = null,
  text,
  authorId,
}) {
  const { error } = await supabase
    .from('comments')
    .insert({
      id,
      post_id: postId,
      scope,
      thread_id: threadId ?? null,
      parent_id: parentId ?? null,
      text,
      author_id: authorId,
    })
  if (error) throw error
}

export async function deleteComments(commentIds) {
  if (!commentIds?.length) return

  // Reactions reference comments polymorphically, so no FK cascade covers them.
  // RLS only lets a viewer delete their own reactions; the rest are swept by the
  // comments_delete_reactions trigger, so a partial result here is expected.
  const reactionCleanup = await supabase
    .from('reactions')
    .delete()
    .eq('target_type', 'comment')
    .in('target_id', commentIds)
  if (reactionCleanup.error) {
    console.warn('Could not clear reactions before deleting comments', reactionCleanup.error)
  }

  const { error } = await supabase
    .from('comments')
    .delete()
    .in('id', commentIds)
  if (error) throw error
}

export async function insertReaction({ id, targetType, targetId, emoji, viewerId }) {
  const { error } = await supabase
    .from('reactions')
    .insert({
      id,
      target_type: targetType,
      target_id: targetId,
      emoji,
      viewer_id: viewerId,
    })
  if (error) throw error
}

export async function deleteReaction(id) {
  const { error } = await supabase
    .from('reactions')
    .delete()
    .eq('id', id)
  if (error) throw error
}
