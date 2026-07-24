/*
  Shared field styles for custom Clerk auth forms (sign-in / sign-up).
*/

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
