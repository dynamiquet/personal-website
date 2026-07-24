/*
  context/AuthContext.jsx

  Temporary author/reader switch while real auth is being built.
  Readers are the default. Author mode is a localStorage flag set from
  /login — swap this for Clerk (or whatever) later without touching the
  pages that already call useAuth().isAuthor.
*/

import { createContext, useContext, useState } from 'react'

const STORAGE_KEY = 'dt_is_author'
const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [isAuthor, setIsAuthor] = useState(
    () => localStorage.getItem(STORAGE_KEY) === '1',
  )

  function loginAsAuthor() {
    localStorage.setItem(STORAGE_KEY, '1')
    setIsAuthor(true)
  }

  function logout() {
    localStorage.removeItem(STORAGE_KEY)
    setIsAuthor(false)
  }

  return (
    <AuthContext.Provider value={{ isAuthor, loginAsAuthor, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
