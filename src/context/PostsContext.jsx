/*
  context/PostsContext.jsx

  Wraps all post state so any page can read or mutate posts without prop
  drilling. Dev persistence: shared JSON via /api/posts (see vite-plugin-local-api).

  Usage:
    import { usePostsContext } from '../context/PostsContext'
    const { posts, addPost, updatePost, deletePost } = usePostsContext()
*/

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react'
import { SEED_POSTS, fetchPosts, pushPosts } from '../../data/seed'

const PostsContext = createContext(null)

export function PostsProvider({ children }) {
  const [posts, setPosts] = useState(() => [...SEED_POSTS])

  useEffect(() => {
    let cancelled = false

    async function load() {
      const remote = await fetchPosts()
      if (!cancelled) setPosts(remote)
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
    setPosts(next)
    pushPosts(next).catch((err) => {
      console.warn('Failed to persist posts to shared JSON', err)
    })
  }, [])

  function addPost(post) {
    persist([post, ...posts])
  }

  function updatePost(id, changes) {
    const next = posts.map(p => {
      if (p.id !== id) return p
      const merged = { ...p, ...changes }
      delete merged.footer
      return merged
    })
    persist(next)
  }

  function deletePost(id) {
    persist(posts.filter(p => p.id !== id))
  }

  return (
    <PostsContext.Provider value={{ posts, addPost, updatePost, deletePost }}>
      {children}
    </PostsContext.Provider>
  )
}

export function usePostsContext() {
  const ctx = useContext(PostsContext)
  if (!ctx) throw new Error('usePostsContext must be used inside <PostsProvider>')
  return ctx
}
