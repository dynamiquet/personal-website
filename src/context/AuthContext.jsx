/*
  context/AuthContext.jsx

  Author vs reader is driven by Clerk publicMetadata.
  In the Clerk Dashboard → Users → (your user) → Public metadata:

    { "role": "author" }

  Everyone else (signed out, or signed in without that role) is a reader.
  Pages keep calling useAuth().isAuthor — only this file talks to Clerk.
*/

import { useUser } from '@clerk/react'

export function useAuth() {
  const { isLoaded, isSignedIn, user } = useUser()

  const isAuthor = Boolean(
    isSignedIn && user?.publicMetadata?.role === 'author',
  )

  return {
    isLoaded,
    isSignedIn: Boolean(isSignedIn),
    isAuthor,
    user,
  }
}
