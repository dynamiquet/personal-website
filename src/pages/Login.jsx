/*
  pages/Login.jsx — email + password via Supabase Auth.
*/

import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import {
  PasswordField,
  authButtonClass,
  authInputClass,
  authLabelClass,
} from '../components/authStyles'

export default function Login() {
  const { isLoaded, isSignedIn, isAuthor, user, signOut } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const returnTo = typeof location.state?.from === 'string' && location.state.from.startsWith('/')
    ? location.state.from
    : '/writings'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [formError, setFormError] = useState('')
  const [busy, setBusy] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setFormError('')
    setBusy(true)
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        setFormError(error.message || 'Could not sign in.')
        return
      }
      navigate(returnTo)
    } finally {
      setBusy(false)
    }
  }

  if (!isLoaded) {
    return (
      <section className="min-h-screen bg-grad-landing pt-16 px-6 flex items-center justify-center">
        <p className="font-ui text-[14px] text-ink-soft">Loading…</p>
      </section>
    )
  }

  if (isSignedIn) {
    return (
      <section
        className="min-h-screen bg-grad-landing pt-16 px-6
                   flex items-center justify-center"
      >
        <div className="w-full max-w-[400px] text-center">
          <p className="font-ui text-[12px] font-semibold tracking-[0.14em]
                        uppercase text-ink-soft mb-3">
            Account
          </p>
          <h1 className="font-display text-[clamp(2rem,5vw,2.6rem)] text-ink
                         font-semibold tracking-tight mb-4">
            You&apos;re signed in
          </h1>
          <p className="font-ui text-[15px] text-ink-soft mb-2">
            {user?.email}
          </p>
          <p className="font-ui text-[15px] text-ink-soft mb-8">
            {isAuthor
              ? 'Author tools are unlocked — you can create and edit essays.'
              : 'You can read essays. Author editing unlocks only for accounts with the author role.'}
          </p>
          <div className="flex flex-col items-center gap-3">
            <Link
              to="/writings"
              className="text-accent-str font-ui text-[14px]
                         hover:opacity-75 transition-opacity"
            >
              {isAuthor ? '← My essays' : '← Essays'}
            </Link>
            <button
              type="button"
              onClick={() => signOut()}
              className="font-ui text-[14px] text-ink-soft hover:text-ink transition-colors"
            >
              Log out
            </button>
          </div>
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
          Account
        </p>
        <h1 className="font-display text-[clamp(2rem,5vw,2.6rem)] text-ink
                       font-semibold tracking-tight mb-2">
          Sign in
        </h1>
        <p className="font-ui text-[14px] text-ink-soft mb-8">
          Welcome back.
        </p>

        <form onSubmit={handleSubmit} className="space-y-5">
          <label className="block">
            <span className={authLabelClass}>Email</span>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              className={authInputClass}
            />
          </label>

          <PasswordField
            value={password}
            onChange={e => setPassword(e.target.value)}
            autoComplete="current-password"
          />

          {formError && (
            <p className="font-ui text-[13px] text-red-600">{formError}</p>
          )}

          <button type="submit" disabled={busy} className={authButtonClass}>
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="mt-8 text-center font-ui text-[14px] text-ink-soft">
          No account yet?{' '}
          <Link
            to="/signup"
            className="text-accent-str hover:opacity-75 transition-opacity"
          >
            Sign up
          </Link>
        </p>
        <p className="mt-3 text-center font-ui text-[14px] text-ink-soft">
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
