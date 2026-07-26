/*
  Shared field styles for custom auth forms (sign-in / sign-up).
*/

import { useState } from 'react'

export const authInputClass =
  `w-full rounded-xl border border-black/8 bg-white/80
   px-4 py-3 font-ui text-[15px] text-ink
   placeholder:text-ink-soft/50
   outline-none focus:border-accent focus:ring-2
   focus:ring-accent/25 transition`

export const authLabelClass =
  'font-ui text-[13px] font-medium text-ink mb-1.5 block'

export const authButtonClass =
  `w-full rounded-xl bg-accent-str text-white font-ui
   text-[15px] font-semibold py-3.5
   hover:bg-accent transition-colors
   disabled:opacity-50 disabled:cursor-not-allowed`

export const authErrorClass = 'mt-1.5 font-ui text-[13px] text-red-600'

export function FieldError({ message }) {
  if (!message) return null
  return <p className={authErrorClass}>{message}</p>
}

/** Password input with a Show / Hide control. */
export function PasswordField({
  id = 'password',
  name = 'password',
  label = 'Password',
  value,
  onChange,
  autoComplete = 'current-password',
  placeholder = '••••••••',
  required = true,
  errorMessage,
}) {
  const [visible, setVisible] = useState(false)

  return (
    <label className="block">
      <span className={authLabelClass}>{label}</span>
      <div className="relative">
        <input
          id={id}
          name={name}
          type={visible ? 'text' : 'password'}
          autoComplete={autoComplete}
          required={required}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className={`${authInputClass} pr-16`}
        />
        <button
          type="button"
          onClick={() => setVisible(v => !v)}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg px-2.5 py-1.5
                     font-ui text-[12px] font-semibold text-ink-soft
                     hover:text-ink hover:bg-black/5 transition-colors"
          aria-pressed={visible}
          aria-label={visible ? 'Hide password' : 'Show password'}
        >
          {visible ? 'Hide' : 'Show'}
        </button>
      </div>
      <FieldError message={errorMessage} />
    </label>
  )
}
