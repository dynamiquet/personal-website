/*
  pages/BlogPost.jsx — a single essay.

  Authors get read + edit modes (Edit / Save / Delete).
  Readers only see the reading view — no toolbar, no edit affordances.
*/

import { useEffect, useState } from 'react'
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { usePostsContext } from '../context/PostsContext'
import { readingTime } from '../utils/helpers'

export default function BlogPost() {
  const { id }                          = useParams()
  const navigate                        = useNavigate()
  const { state: routerState }          = useLocation()
  const { isAuthor }                    = useAuth()
  const { posts, updatePost, deletePost } = usePostsContext()

  const post = posts.find(p => p.id === id)
  const backLabel = isAuthor ? '← My essays' : '← Essays'

  // Local edit state — only committed to context/localStorage on Save.
  // Readers never enter edit mode, even if router state asks for it.
  const [isEditing, setIsEditing] = useState(
    isAuthor && (routerState?.editing ?? false),
  )
  const [title, setTitle] = useState(post?.title ?? '')
  const [body,  setBody]  = useState(post?.body  ?? '')

  useEffect(() => {
    if (!isAuthor) setIsEditing(false)
  }, [isAuthor])

  if (!post) {
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
    const firstLine = body.split('\n').find(l => l.trim())
    updatePost(id, {
      title:   title.trim() || 'Untitled',
      body,
      excerpt: firstLine ? firstLine.slice(0, 110) : post.excerpt,
    })
  }

  function handleToggleEdit() {
    if (!isAuthor) return
    if (isEditing) save()
    setIsEditing(e => !e)
  }

  function handleDelete() {
    if (!isAuthor) return
    if (!window.confirm('Delete this essay? This cannot be undone.')) return
    deletePost(id)
    navigate('/writings')
  }

  function handleSave() {
    if (!isAuthor) return
    save()
    setIsEditing(false)
  }

  const wordCount = body.trim().split(/\s+/).filter(Boolean).length
  const showEditUi = isAuthor

  return (
    <section className="min-h-screen bg-grad-post text-choc-text pt-16 pb-28 px-[6vw]">

      {showEditUi && (
        <div className="max-w-[880px] mx-auto mb-5 flex items-center gap-3 justify-end">
          {isEditing && (
            <span className="mr-auto text-choc-soft text-xs font-ui">
              {wordCount} words
            </span>
          )}

          <button
            onClick={handleToggleEdit}
            className="font-ui text-[0.8rem] font-semibold px-4 py-2 rounded-full
                       bg-white/10 text-choc-text border border-white/25
                       hover:bg-white/20 transition-colors"
          >
            {isEditing ? 'Reading mode' : 'Edit'}
          </button>

          {isEditing && (
            <>
              <button
                onClick={handleDelete}
                className="font-ui text-[0.8rem] font-semibold px-4 py-2 rounded-full
                           text-[#e8a98c] border border-[#e8a98c]/40
                           hover:bg-white/10 transition-colors"
              >
                Delete
              </button>
              <button
                onClick={handleSave}
                className="font-ui text-[0.8rem] font-semibold px-4 py-2 rounded-full
                           bg-choc-accent text-choc-deep border-choc-accent
                           hover:opacity-90 transition-opacity"
              >
                Save
              </button>
            </>
          )}
        </div>
      )}

      <div className="max-w-[880px] mx-auto">

        <div className="flex items-center justify-between mb-8">
          <Link
            to="/writings"
            className="text-choc-accent text-[0.9rem] font-semibold font-ui
                       hover:opacity-80 transition-opacity"
          >
            {backLabel}
          </Link>
          <span className="text-choc-soft text-[0.8rem] font-ui">
            {post.date} · {readingTime(post.body)}
          </span>
        </div>

        {isEditing ? (
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Title"
            className="w-full bg-transparent text-choc-text font-display font-medium
                       text-[clamp(1.9rem,4vw,2.8rem)] leading-snug mb-8
                       border-b border-choc-text/20 pb-2 outline-none
                       placeholder:text-choc-soft/50 focus:border-choc-accent
                       transition-colors"
          />
        ) : (
          <h1 className="font-display font-medium text-choc-text
                         text-[clamp(1.9rem,4vw,2.8rem)] leading-snug mb-8">
            {post.title}
          </h1>
        )}

        {isEditing ? (
          <textarea
            value={body}
            onChange={e => setBody(e.target.value)}
            placeholder="Start writing..."
            rows={18}
            className="w-full bg-transparent text-choc-text font-hand
                       text-[1.85rem] leading-[1.85] resize-none outline-none
                       border border-choc-text/15 rounded-lg p-4
                       placeholder:text-choc-soft/40 focus:border-choc-accent/50
                       transition-colors"
          />
        ) : (
          <div className="font-hand text-[1.85rem] leading-[1.85] text-choc-text whitespace-pre-wrap">
            {post.body || (
              <span className="text-choc-soft italic">
                {isAuthor
                  ? 'No content yet — click Edit to write.'
                  : 'No content yet.'}
              </span>
            )}
          </div>
        )}

      </div>
    </section>
  )
}
