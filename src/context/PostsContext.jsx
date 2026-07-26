/*
  context/PostsContext.jsx

  Wraps all post state so any page can read or mutate posts without prop
  drilling. The actual localStorage logic stays in src/data/seed.js.

  Usage:
    import { usePostsContext } from '../context/PostsContext'
    const { posts, addPost, updatePost, deletePost } = usePostsContext()
*/

import { createContext, useContext, useState } from 'react'
import { loadPosts, savePosts } from '../../data/seed'

const PostsContext = createContext(null)

export function PostsProvider({ children }) {
  const [posts, setPosts] = useState(() => loadPosts())

  function addPost(post) {
    const next = [post, ...posts]
    setPosts(next)
    savePosts(next)
  }

  function updatePost(id, changes) {
    const next = posts.map(p => {
      if (p.id !== id) return p
      const merged = { ...p, ...changes }
      delete merged.footer
      return merged
    })
    setPosts(next)
    savePosts(next)
  }

  function deletePost(id) {
    const next = posts.filter(p => p.id !== id)
    setPosts(next)
    savePosts(next)
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
