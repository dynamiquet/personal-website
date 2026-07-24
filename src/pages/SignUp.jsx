/*
  pages/SignUp.jsx — custom sign-up UI, Clerk-backed.

  Flow (email + password + email code verification):
    1. signUp.password({ emailAddress, password })
    2. signUp.verifications.sendEmailCode()
    3. signUp.verifications.verifyEmailCode({ code })
    4. signUp.finalize() → redirect to /writings

  Requires email + password enabled in the Clerk Dashboard.
  Bot protection needs the #clerk-captcha element on this page.
*/

import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Show, UserButton, useSignUp } from '@clerk/react'
import { useAuth } from '../context/AuthContext'
import {
  FieldError,
  authButtonClass,
  authInputClass,
  authLabelClass,
} from '../components/authStyles'

export default function SignUp() {
  const { signUp, errors, fetchStatus } = useSignUp()
  const { isAuthor } = useAuth()
  const navigate = useNavigate()

  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [code, setCode]         = useState('')
  const [formError, setFormError] = useState('')

  const busy = fetchStatus === 'fetching'
  const awaitingEmailCode =
    signUp?.status === 'missing_requirements' &&
    signUp?.unverifiedFields?.includes('email_address') &&
    (signUp?.missingFields?.length ?? 0) === 0

  async function finishSignUp() {
    await signUp.finalize({
      navigate: ({ session }) => {
        if (session?.currentTask) return
        navigate('/writings')
      },
    })
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setFormError('')

    const { error } = await signUp.password({
      emailAddress: email,
      password,
    })
    if (error) {
      setFormError(error.message || 'Could not start sign-up.')
      return
    }

    await signUp.verifications.sendEmailCode()
  }

  async function handleVerify(e) {
    e.preventDefault()
    setFormError('')

    const { error } = await signUp.verifications.verifyEmailCode({ code })
    if (error) {
      setFormError(error.message || 'Invalid verification code.')
      return
    }

    if (signUp.status === 'complete') {
      await finishSignUp()
    } else {
      setFormError('Sign-up is not complete yet. Try again or request a new code.')
    }
  }

  return (
    <section
      className="min-h-screen bg-grad-landing pt-16 px-6
                 flex items-center justify-center"
    >
      <div className="w-full max-w-[400px]">
        <Show when="signed-in">
          <div className="text-center">
            <p className="font-ui text-[12px] font-semibold tracking-[0.14em]
                          uppercase text-ink-soft mb-3">
              Account
            </p>
            <h1 className="font-display text-[clamp(2rem,5vw,2.6rem)] text-ink
                           font-semibold tracking-tight mb-4">
              You&apos;re signed in
            </h1>
            <p className="font-ui text-[15px] text-ink-soft mb-8">
              {isAuthor
                ? 'Author tools are unlocked — you can create and edit essays.'
                : 'You can read essays. Author editing unlocks only for accounts with the author role.'}
            </p>
            <div className="flex justify-center mb-8">
              <UserButton afterSignOutUrl="/" />
            </div>
            <Link
              to="/writings"
              className="text-accent-str font-ui text-[14px]
                         hover:opacity-75 transition-opacity"
            >
              {isAuthor ? '← My essays' : '← Essays'}
            </Link>
          </div>
        </Show>

        <Show when="signed-out">
          <p className="font-ui text-[12px] font-semibold tracking-[0.14em]
                        uppercase text-ink-soft mb-3">
            Account
          </p>
          <h1 className="font-display text-[clamp(2rem,5vw,2.6rem)] text-ink
                         font-semibold tracking-tight mb-2">
            {awaitingEmailCode ? 'Check your email' : 'Sign up'}
          </h1>
          <p className="font-ui text-[14px] text-ink-soft mb-8">
            {awaitingEmailCode
              ? `Enter the code we sent to ${email || 'your inbox'}.`
              : 'Create an account to follow along. Editing stays author-only.'}
          </p>

          {awaitingEmailCode ? (
            <form onSubmit={handleVerify} className="space-y-5">
              <label className="block">
                <span className={authLabelClass}>Verification code</span>
                <input
                  id="code"
                  name="code"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  required
                  value={code}
                  onChange={e => setCode(e.target.value)}
                  placeholder="123456"
                  className={authInputClass}
                />
                <FieldError message={errors?.fields?.code?.message} />
              </label>

              {(formError || errors?.global?.[0]) && (
                <p className="font-ui text-[13px] text-red-600">
                  {formError || errors.global[0].message}
                </p>
              )}

              <button type="submit" disabled={busy} className={authButtonClass}>
                {busy ? 'Verifying…' : 'Verify'}
              </button>

              <button
                type="button"
                disabled={busy}
                onClick={() => signUp.verifications.sendEmailCode()}
                className="w-full font-ui text-[14px] text-ink-soft
                           hover:text-ink transition-colors py-2"
              >
                Resend code
              </button>
            </form>
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
                <FieldError message={errors?.fields?.emailAddress?.message} />
              </label>

              <label className="block">
                <span className={authLabelClass}>Password</span>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className={authInputClass}
                />
                <FieldError message={errors?.fields?.password?.message} />
              </label>

              {(formError || errors?.global?.[0]) && (
                <p className="font-ui text-[13px] text-red-600">
                  {formError || errors.global[0].message}
                </p>
              )}

              <button type="submit" disabled={busy || !signUp} className={authButtonClass}>
                {busy ? 'Creating account…' : 'Create account'}
              </button>

              {/* Required for Clerk bot sign-up protection */}
              <div id="clerk-captcha" />
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
        </Show>
      </div>
    </section>
  )
}
