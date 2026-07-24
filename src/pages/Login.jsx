/*
  pages/Login.jsx — author login UI only (no real auth yet).

  Matches the site palette: soft landing gradient, ink text, accent CTA.
  Clerk wiring comes later; this is the visual shell.
*/

import { useState } from 'react'
import { Link } from 'react-router-dom'

export default function Login() {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')

  function handleSubmit(e) {
    e.preventDefault()
    // UI only — Clerk will own this later
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

        <form onSubmit={handleSubmit} className="space-y-5">
          <label className="block">
            <span className="font-ui text-[13px] font-medium text-ink mb-1.5 block">
              Email
            </span>
            <input
              type="email"
              autoComplete="email"
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
