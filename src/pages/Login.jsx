/*
  pages/Login.jsx — author login UI (mock auth for now).

  Matches the site palette: soft landing gradient, ink text, accent CTA.
  Submitting flips the AuthContext author flag and sends you to /writings.
  Clerk (or similar) can replace loginAsAuthor() later.
*/

import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const { isAuthor, loginAsAuthor, logout } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')

  function handleSubmit(e) {
    e.preventDefault()
    loginAsAuthor()
    navigate('/writings')
  }

  if (isAuthor) {
    return (
      <section
        className="min-h-screen bg-grad-landing pt-16 px-6
                   flex items-center justify-center"
      >
        <div className="w-full max-w-[400px] text-center">
          <p className="font-ui text-[12px] font-semibold tracking-[0.14em]
                        uppercase text-ink-soft mb-3">
            Author
          </p>
          <h1 className="font-display text-[clamp(2rem,5vw,2.6rem)] text-ink
                         font-semibold tracking-tight mb-4">
            You&apos;re signed in
          </h1>
          <p className="font-ui text-[15px] text-ink-soft mb-8">
            Edit mode and new essays are unlocked in this browser.
          </p>
          <button
            type="button"
            onClick={() => {
              logout()
              navigate('/writings')
            }}
            className="w-full rounded-xl bg-accent-str text-white font-ui
                       text-[15px] font-semibold py-3.5
                       hover:bg-accent transition-colors"
          >
            Sign out
          </button>
          <p className="mt-8 font-ui text-[14px] text-ink-soft">
            <Link
              to="/writings"
              className="text-accent-str hover:opacity-75 transition-opacity"
            >
              ← My essays
            </Link>
          </p>
        </div>
      </section>
    )
  }

  return (
    <section
      className="min-h-screen bg-grad-landing pt-16 px-6
                 flex items-center justify-center"
    >
      <div className="w-full max-w-[400px]">
        <p className="font-ui text-[12px] font-semibold tracking-[0.14em]
                      uppercase text-ink-soft mb-3">
          Author
        </p>
        <h1 className="font-display text-[clamp(2rem,5vw,2.6rem)] text-ink
                       font-semibold tracking-tight mb-2">
          Sign in
        </h1>
        <p className="font-ui text-[14px] text-ink-soft mb-8">
          Temporary mock login — any email/password works until real auth lands.
        </p>

        <form onSubmit={handleSubmit} className="space-y-5">
          <label className="block">
            <span className="font-ui text-[13px] font-medium text-ink mb-1.5 block">
              Email
            </span>
            <input
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full rounded-xl border border-black/8 bg-white/80
                         px-4 py-3 font-ui text-[15px] text-ink
                         placeholder:text-ink-soft/50
                         outline-none focus:border-accent focus:ring-2
                         focus:ring-accent/25 transition"
            />
          </label>

          <label className="block">
            <span className="font-ui text-[13px] font-medium text-ink mb-1.5 block">
              Password
            </span>
            <input
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-xl border border-black/8 bg-white/80
                         px-4 py-3 font-ui text-[15px] text-ink
                         placeholder:text-ink-soft/50
                         outline-none focus:border-accent focus:ring-2
                         focus:ring-accent/25 transition"
            />
          </label>

          <button
            type="submit"
            className="w-full rounded-xl bg-accent-str text-white font-ui
                       text-[15px] font-semibold py-3.5
                       hover:bg-accent transition-colors"
          >
            Sign in
          </button>
        </form>

        <p className="mt-8 text-center font-ui text-[14px] text-ink-soft">
          <Link
            to="/"
            className="text-accent-str hover:opacity-75 transition-opacity"
          >
            ← Back home
          </Link>
        </p>
      </div>
    </section>
  )
}
