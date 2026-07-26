/*
  pages/Login.jsx — custom sign-in UI, Clerk-backed.

  Uses useSignIn().password() + finalize(). Handles Client Trust
  (email code) when Clerk asks for it.
*/

import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { Show, UserButton, useSignIn } from '@clerk/react'
import { useAuth } from '../context/AuthContext'
import {
  FieldError,
  PasswordField,
  authButtonClass,
  authInputClass,
  authLabelClass,
} from '../components/authStyles'

export default function Login() {
  const { signIn, errors, fetchStatus } = useSignIn()
  const { isAuthor } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const returnTo = typeof location.state?.from === 'string' && location.state.from.startsWith('/')
    ? location.state.from
    : '/writings'

  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [code, setCode]         = useState('')
  const [formError, setFormError] = useState('')

  const busy = fetchStatus === 'fetching'
  const needsClientTrust = signIn?.status === 'needs_client_trust'

  async function finishSignIn() {
    await signIn.finalize({
      navigate: ({ session }) => {
        if (session?.currentTask) return
        navigate(returnTo)
      },
    })
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setFormError('')

    const { error } = await signIn.password({
      emailAddress: email,
      password,
    })
    if (error) {
      setFormError(error.message || 'Could not sign in.')
      return
    }

    if (signIn.status === 'complete') {
      await finishSignIn()
      return
    }

    if (signIn.status === 'needs_client_trust') {
      const emailCodeFactor = signIn.supportedSecondFactors?.find(
        f => f.strategy === 'email_code',
      )
      if (emailCodeFactor) await signIn.mfa.sendEmailCode()
      return
    }

    if (signIn.status === 'needs_second_factor') {
      setFormError('This account requires an extra verification step.')
      return
    }

    setFormError('Sign-in is not complete yet. Please try again.')
  }

  async function handleVerify(e) {
    e.preventDefault()
    setFormError('')

    const { error } = await signIn.mfa.verifyEmailCode({ code })
    if (error) {
      setFormError(error.message || 'Invalid verification code.')
      return
    }

    if (signIn.status === 'complete') {
      await finishSignIn()
    } else {
      setFormError('Verification did not complete. Try a new code.')
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
            {needsClientTrust ? 'Verify it\'s you' : 'Sign in'}
          </h1>
          <p className="font-ui text-[14px] text-ink-soft mb-8">
            {needsClientTrust
              ? `Enter the code we sent to ${email || 'your email'}.`
              : 'Welcome back.'}
          </p>

          {needsClientTrust ? (
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
                onClick={() => signIn.mfa.sendEmailCode()}
                className="w-full font-ui text-[14px] text-ink-soft
                           hover:text-ink transition-colors py-2"
              >
                Resend code
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => signIn.reset()}
                className="w-full font-ui text-[14px] text-ink-soft
                           hover:text-ink transition-colors py-2"
              >
                Start over
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
                <FieldError message={errors?.fields?.identifier?.message} />
              </label>

              <PasswordField
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete="current-password"
                errorMessage={errors?.fields?.password?.message}
              />

              {(formError || errors?.global?.[0]) && (
                <p className="font-ui text-[13px] text-red-600">
                  {formError || errors.global[0].message}
                </p>
              )}

              <button type="submit" disabled={busy || !signIn} className={authButtonClass}>
                {busy ? 'Signing in…' : 'Sign in'}
              </button>
            </form>
          )}

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
        </Show>
      </div>
    </section>
  )
}
