/*
  Supabase CRUD for essays.
  App code keeps camelCase; this module maps to/from posts table rows.
*/

import { supabase } from './supabase'
import { formatPublishedAt } from '../utils/helpers'

const POST_COLUMNS = `
  id,
  author_id,
  title,
  excerpt,
  body,
  published_at,
  body_font,
  text_size,
  align,
  footnotes
`

export function rowToPost(row) {
  if (!row) return null
  return {
    id: row.id,
    authorId: row.author_id,
    title: row.title ?? '',
    excerpt: row.excerpt ?? '',
    body: row.body ?? '',
    publishedAt: row.published_at,
    date: formatPublishedAt(row.published_at),
    footnotes: Array.isArray(row.footnotes) ? row.footnotes : [],
    bodyFont: row.body_font ?? 'hand',
    textSize: row.text_size ?? 'md',
    align: row.align ?? 'left',
  }
}

function changesToRow(changes = {}) {
  const row = {}
  if ('title' in changes) row.title = changes.title
  if ('excerpt' in changes) row.excerpt = changes.excerpt
  if ('body' in changes) row.body = changes.body
  if ('footnotes' in changes) row.footnotes = changes.footnotes ?? []
  if ('bodyFont' in changes) row.body_font = changes.bodyFont
  if ('textSize' in changes) row.text_size = changes.textSize
  if ('align' in changes) row.align = changes.align
  if ('publishedAt' in changes) row.published_at = changes.publishedAt
  return row
}

export async function listPosts() {
  const { data, error } = await supabase
    .from('posts')
    .select(POST_COLUMNS)
    .order('published_at', { ascending: false })

  if (error) throw error
  return (data ?? []).map(rowToPost)
}

export async function createPost({
  authorId,
  title = 'Untitled',
  excerpt = '',
  body = '',
  footnotes = [],
  bodyFont = 'hand',
  textSize = 'md',
  align = 'left',
  publishedAt,
} = {}) {
  if (!authorId) throw new Error('authorId is required to create a post')

  const payload = {
    author_id: authorId,
    title,
    excerpt,
    body,
    footnotes,
    body_font: bodyFont,
    text_size: textSize,
    align,
  }
  if (publishedAt) payload.published_at = publishedAt

  const { data, error } = await supabase
    .from('posts')
    .insert(payload)
    .select(POST_COLUMNS)
    .single()

  if (error) throw error
  return rowToPost(data)
}

export async function updatePostRow(id, changes) {
  const payload = changesToRow(changes)
  if (Object.keys(payload).length === 0) {
    const { data, error } = await supabase
      .from('posts')
      .select(POST_COLUMNS)
      .eq('id', id)
      .single()
    if (error) throw error
    return rowToPost(data)
  }

  const { data, error } = await supabase
    .from('posts')
    .update(payload)
    .eq('id', id)
    .select(POST_COLUMNS)
    .single()

  if (error) throw error
  return rowToPost(data)
}

export async function deletePostRow(id) {
  const { error } = await supabase
    .from('posts')
    .delete()
    .eq('id', id)

  if (error) throw error
}
