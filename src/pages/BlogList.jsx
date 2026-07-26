/*
  pages/BlogList.jsx — essays index.

  Readers see the scattered cards only.
  Authors also get "+ New essay", which creates a post and opens it in edit mode.
*/

import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { usePostsContext } from '../context/PostsContext'
import { cardStyle, readingTime, formatDateToday } from '../utils/helpers'

export default function BlogList() {
  const { isAuthor } = useAuth()
  const { posts, addPost } = usePostsContext()
  const navigate = useNavigate()

  function handleNewPost() {
    const post = {
      id:       'p' + Date.now(),
      title:    'Untitled',
      excerpt:  'Click edit to write something here.',
      date:     formatDateToday(),
      body:      '',
      footnotes: [],
      bodyFont:  'hand',
      textSize: 'md',
      align:    'left',
    }
    addPost(post)
    navigate(`/writings/${post.id}`, { state: { editing: true } })
  }

  return (
    <section className="min-h-screen bg-grad-blog pt-16 pb-24 px-[6vw]">
      <div className="flex flex-wrap gap-y-9 gap-x-8 justify-center max-w-[1100px] mx-auto pt-14">

        {posts.map((post, i) => (
          <article
            key={post.id}
            className="blog-card relative w-[300px] min-h-[230px] rounded-[18px]
                       bg-white/80 shadow-card cursor-pointer
                       flex flex-col justify-center text-center
                       px-6 pt-6 pb-12"
            style={cardStyle(i)}
            onClick={() => navigate(`/writings/${post.id}`)}
            role="button"
            tabIndex={0}
            onKeyDown={e => e.key === 'Enter' && navigate(`/writings/${post.id}`)}
          >
            <h2 className="font-display font-medium text-[1.4rem] leading-snug
                           text-ink mb-2">
              {post.title}
            </h2>
            <p className="text-ink-soft text-[0.92rem] leading-relaxed">
              {post.excerpt}
            </p>

            <span className="absolute left-5 bottom-4 text-[0.74rem]
                             tracking-wide text-ink-soft font-medium font-ui">
              {post.date}
            </span>
            <span className="absolute right-5 bottom-4 text-[0.74rem]
                             text-ink-soft opacity-75 font-ui">
              {readingTime(post.body)}
            </span>
          </article>
        ))}

        {isAuthor && (
          <button
            onClick={handleNewPost}
            className="w-[300px] min-h-[230px] rounded-[18px]
                       border-[1.5px] border-dashed border-accent/40
                       flex flex-col items-center justify-center gap-2
                       text-ink-soft hover:border-accent hover:text-accent
                       transition-colors cursor-pointer bg-transparent"
          >
            <span className="text-[2rem] leading-none font-light">+</span>
            <span className="text-sm font-ui font-medium">New essay</span>
          </button>
        )}

      </div>
    </section>
  )
}
