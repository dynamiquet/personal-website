/*
  pages/BlogPost.jsx — a single essay.

  Authors get read + edit modes. Edit mode includes a toolbar for font,
  size, alignment, and an optional essay footer.
  Readers only see the reading view.
*/

import { useEffect, useState } from 'react'
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { usePostsContext } from '../context/PostsContext'
import EditToolbar from '../components/EditToolbar'
import {
  readingTime,
  essayDefaults,
  bodyFontClass,
  textSizeClass,
} from '../utils/helpers'

export default function BlogPost() {
  const { id }                          = useParams()
  const navigate                        = useNavigate()
  const { state: routerState }          = useLocation()
  const { isAuthor }                    = useAuth()
  const { posts, updatePost, deletePost } = usePostsContext()

  const post = posts.find(p => p.id === id)
  const defaults = essayDefaults(post)
  const backLabel = isAuthor ? '← My essays' : '← Essays'

  const [isEditing, setIsEditing] = useState(
    isAuthor && (routerState?.editing ?? false),
  )
  const [title, setTitle]         = useState(post?.title ?? '')
  const [body, setBody]           = useState(post?.body ?? '')
  const [footer, setFooter]       = useState(defaults.footer)
  const [bodyFont, setBodyFont]   = useState(defaults.bodyFont)
  const [textSize, setTextSize]   = useState(defaults.textSize)
  const [align, setAlign]         = useState(defaults.align)
  const [showFooter, setShowFooter] = useState(Boolean(defaults.footer))

  useEffect(() => {
    if (!isAuthor) setIsEditing(false)
  }, [isAuthor])

  // Keep local edit fields in sync when switching essays.
  useEffect(() => {
    if (!post) return
    const d = essayDefaults(post)
    setTitle(post.title ?? '')
    setBody(post.body ?? '')
    setFooter(d.footer)
    setBodyFont(d.bodyFont)
    setTextSize(d.textSize)
    setAlign(d.align)
    setShowFooter(Boolean(d.footer))
  }, [post?.id])

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
      title:    title.trim() || 'Untitled',
      body,
      footer:   footer.trim(),
      bodyFont,
      textSize,
      align,
      excerpt:  firstLine ? firstLine.slice(0, 110) : post.excerpt,
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

  // Reading view uses saved post fields; edit preview uses local state.
  const viewFont  = isEditing ? bodyFont : (post.bodyFont ?? 'hand')
  const viewSize  = isEditing ? textSize : (post.textSize ?? 'md')
  const viewAlign = isEditing ? align    : (post.align ?? 'left')
  const viewFooter = isEditing ? footer  : (post.footer ?? '')
  const bodyClasses = `${bodyFontClass(viewFont)} ${textSizeClass(viewSize)} ${
    viewAlign === 'center' ? 'text-center' : 'text-left'
  }`

  return (
    <section className="min-h-screen bg-grad-post text-choc-text pt-16 pb-28 px-[6vw]">

      {showEditUi && isEditing && (
        <EditToolbar
          wordCount={wordCount}
          bodyFont={bodyFont}
          textSize={textSize}
          align={align}
          showFooter={showFooter}
          onBodyFont={setBodyFont}
          onTextSize={setTextSize}
          onAlign={setAlign}
          onToggleFooter={() => setShowFooter(s => !s)}
          onReadingMode={handleToggleEdit}
          onDelete={handleDelete}
          onSave={handleSave}
        />
      )}

      {showEditUi && !isEditing && (
        <div className="max-w-[880px] mx-auto mb-5 flex justify-end">
          <button
            onClick={handleToggleEdit}
            className="font-ui text-[0.8rem] font-semibold px-4 py-2 rounded-full
                       bg-white/10 text-choc-text border border-white/25
                       hover:bg-white/20 transition-colors"
          >
            Edit
          </button>
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
            {post.date} · {readingTime(isEditing ? body : post.body)}
          </span>
        </div>

        {isEditing ? (
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Title"
            className={`w-full bg-transparent text-choc-text font-display font-medium
                        text-[clamp(1.9rem,4vw,2.8rem)] leading-snug mb-8
                        border-b border-choc-text/20 pb-2 outline-none
                        placeholder:text-choc-soft/50 focus:border-choc-accent
                        transition-colors
                        ${align === 'center' ? 'text-center' : 'text-left'}`}
          />
        ) : (
          <h1
            className={`font-display font-medium text-choc-text
                        text-[clamp(1.9rem,4vw,2.8rem)] leading-snug mb-8
                        ${viewAlign === 'center' ? 'text-center' : 'text-left'}`}
          >
            {post.title}
          </h1>
        )}

        {isEditing ? (
          <textarea
            value={body}
            onChange={e => setBody(e.target.value)}
            placeholder="Start writing..."
            rows={16}
            className={`w-full bg-transparent text-choc-text resize-none outline-none
                        border border-choc-text/15 rounded-lg p-4
                        placeholder:text-choc-soft/40 focus:border-choc-accent/50
                        transition-colors ${bodyClasses}`}
          />
        ) : (
          <div className={`${bodyClasses} text-choc-text whitespace-pre-wrap`}>
            {post.body || (
              <span className="text-choc-soft italic">
                {isAuthor
                  ? 'No content yet — click Edit to write.'
                  : 'No content yet.'}
              </span>
            )}
          </div>
        )}

        {isEditing && showFooter && (
          <div className="mt-10 pt-8 border-t border-choc-text/15">
            <label className="block mb-3 font-ui text-[0.7rem] uppercase
                              tracking-[0.14em] text-choc-soft">
              Essay footer
            </label>
            <textarea
              value={footer}
              onChange={e => setFooter(e.target.value)}
              placeholder="A closing note, dedication, or afterword…"
              rows={4}
              className={`w-full bg-transparent text-choc-soft resize-none outline-none
                          border border-choc-text/15 rounded-lg p-4 text-[1.15rem]
                          leading-relaxed placeholder:text-choc-soft/35
                          focus:border-choc-accent/50 transition-colors
                          ${bodyFontClass(bodyFont)}
                          ${align === 'center' ? 'text-center' : 'text-left'}`}
            />
          </div>
        )}

        {!isEditing && viewFooter.trim() && (
          <footer
            className={`mt-14 pt-8 border-t border-choc-text/15
                        text-choc-soft text-[1.15rem] leading-relaxed
                        whitespace-pre-wrap ${bodyFontClass(viewFont)}
                        ${viewAlign === 'center' ? 'text-center' : 'text-left'}`}
          >
            {viewFooter.trim()}
          </footer>
        )}

      </div>
    </section>
  )
}
