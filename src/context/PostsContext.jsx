/*
  context/PostsContext.jsx

  Shared essay state backed by Supabase `posts` (RLS: public read, author write).
  Pages keep using usePostsContext(); only this module talks to src/lib/posts.

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
import { useAuth } from './AuthContext'
import {
  createPost,
  deletePostRow,
  listPosts,
  updatePostRow,
} from '../lib/posts'

const PostsContext = createContext(null)

function sortByPublishedAt(posts) {
  return [...posts].sort((a, b) => {
    const aTime = new Date(a.publishedAt || 0).getTime()
    const bTime = new Date(b.publishedAt || 0).getTime()
    return bTime - aTime
  })
}

export function PostsProvider({ children }) {
  const { user, isAuthor } = useAuth()
  const [posts, setPosts] = useState([])
  const [isLoaded, setIsLoaded] = useState(false)

  const refresh = useCallback(async () => {
    try {
      const remote = await listPosts()
      setPosts(remote)
    } catch (err) {
      console.warn('Failed to load posts from Supabase', err)
    } finally {
      setIsLoaded(true)
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const remote = await listPosts()
        if (!cancelled) setPosts(remote)
      } catch (err) {
        console.warn('Failed to load posts from Supabase', err)
      } finally {
        if (!cancelled) setIsLoaded(true)
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

  const addPost = useCallback(async (partial = {}) => {
    if (!isAuthor || !user?.id) {
      throw new Error('Only authors can create posts')
    }
    const created = await createPost({
      ...partial,
      authorId: user.id,
    })
    setPosts((prev) => sortByPublishedAt([created, ...prev.filter(p => p.id !== created.id)]))
    return created
  }, [isAuthor, user?.id])

  const updatePost = useCallback(async (id, changes) => {
    if (!isAuthor) {
      throw new Error('Only authors can update posts')
    }
    const updated = await updatePostRow(id, changes)
    setPosts((prev) => sortByPublishedAt(
      prev.map(p => (p.id === id ? updated : p)),
    ))
    return updated
  }, [isAuthor])

  const deletePost = useCallback(async (id) => {
    if (!isAuthor) {
      throw new Error('Only authors can delete posts')
    }
    await deletePostRow(id)
    setPosts((prev) => prev.filter(p => p.id !== id))
  }, [isAuthor])

  return (
    <PostsContext.Provider value={{ posts, isLoaded, refresh, addPost, updatePost, deletePost }}>
      {children}
    </PostsContext.Provider>
  )
}

export function usePostsContext() {
  const ctx = useContext(PostsContext)
  if (!ctx) throw new Error('usePostsContext must be used inside <PostsProvider>')
  return ctx
}
