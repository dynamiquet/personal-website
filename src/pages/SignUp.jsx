/*
  pages/SignUp.jsx — email + password via Supabase Auth.

  With "Confirm email" enabled (dev + prod), signUp usually returns no session.
  We show a "check your email" state; after the confirmation link, they sign in.
*/

import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import {
  PasswordField,
  authButtonClass,
  authInputClass,
  authLabelClass,
} from '../components/authStyles'

export default function SignUp() {
  const { isLoaded, isSignedIn, isAuthor, user, signOut } = useAuth()
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [formError, setFormError] = useState('')
  const [busy, setBusy] = useState(false)
  const [awaitingEmail, setAwaitingEmail] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setFormError('')
    setBusy(true)
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            display_name: email.split('@')[0],
          },
          emailRedirectTo: `${window.location.origin}/login`,
        },
      })
      if (error) {
        setFormError(error.message || 'Could not start sign-up.')
        return
      }

      // Confirmed immediately (unusual when confirm-email is on) → go to essays.
      if (data.session) {
        navigate('/writings')
        return
      }

      setAwaitingEmail(true)
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
          {awaitingEmail ? 'Check your email' : 'Sign up'}
        </h1>
        <p className="font-ui text-[14px] text-ink-soft mb-8">
          {awaitingEmail
            ? `We sent a confirmation link to ${email}. Open it, then sign in.`
            : 'Create an account to comment and react. Editing stays author-only.'}
        </p>

        {awaitingEmail ? (
          <div className="space-y-4">
            <Link
              to="/login"
              className={`${authButtonClass} inline-flex items-center justify-center`}
            >
              Go to sign in
            </Link>
            <button
              type="button"
              onClick={() => setAwaitingEmail(false)}
              className="w-full font-ui text-[14px] text-ink-soft
                         hover:text-ink transition-colors py-2"
            >
              Use a different email
            </button>
          </div>
        ) : (
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
              autoComplete="new-password"
            />

            {formError && (
              <p className="font-ui text-[13px] text-red-600">{formError}</p>
            )}

            <button type="submit" disabled={busy} className={authButtonClass}>
              {busy ? 'Creating account…' : 'Create account'}
            </button>
          </form>
        )}

        <p className="mt-8 text-center font-ui text-[14px] text-ink-soft">
          Already have an account?{' '}
          <Link
            to="/login"
            className="text-accent-str hover:opacity-75 transition-opacity"
          >
            Sign in
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
