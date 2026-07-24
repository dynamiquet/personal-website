/*
  components/Nav.jsx

  Persistent top bar + side drawer.
  Drawer order: Sign in (or UserButton) → Essays / My essays.
  Signed-in users get Log out at the bottom.
  Author label comes from useAuth().isAuthor (Clerk publicMetadata.role).
*/

import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Show, SignOutButton, UserButton } from '@clerk/react'
import { useAuth } from '../context/AuthContext'

function DrawerLink({ to, children, onClose }) {
  return (
    <Link
      to={to}
      onClick={onClose}
      className="block py-3 border-b border-gray-100 text-ink-soft hover:text-ink
                 font-ui text-[15px] font-medium transition-colors"
    >
      {children}
    </Link>
  )
}

export default function Nav() {
  const [open, setOpen] = useState(false)
  const location = useLocation()
  const { isAuthor } = useAuth()

  const isDark = location.pathname.startsWith('/writings/')
  const close  = () => setOpen(false)
  const essaysLabel = isAuthor ? 'My essays' : 'Essays'

  return (
    <>
      <nav
        className={`fixed top-0 left-0 right-0 h-16 z-50 flex items-center
                    justify-between px-7 border-b backdrop-blur-[10px]
                    ${isDark
                      ? 'bg-choc-bg/65 border-white/8'
                      : 'bg-white/55 border-black/5'
                    }`}
      >
        <Link
          to="/"
          className={`font-ui text-[14px] font-semibold tracking-wide
                      hover:opacity-70 transition-opacity
                      ${isDark ? 'text-choc-text' : 'text-ink'}`}
        >
          Dynamique Twizere
        </Link>

        <button
          aria-label="Toggle menu"
          aria-expanded={open}
          onClick={() => setOpen(o => !o)}
          className="flex flex-col justify-between w-6 h-[18px]"
        >
          <span
            className={`block h-0.5 w-full rounded-full transition-transform duration-250
                        ${isDark ? 'bg-choc-text' : 'bg-ink'}
                        ${open ? 'translate-y-2 rotate-45' : ''}`}
          />
          <span
            className={`block h-0.5 w-full rounded-full transition-opacity duration-250
                        ${isDark ? 'bg-choc-text' : 'bg-ink'}
                        ${open ? 'opacity-0' : ''}`}
          />
          <span
            className={`block h-0.5 w-full rounded-full transition-transform duration-250
                        ${isDark ? 'bg-choc-text' : 'bg-ink'}
                        ${open ? '-translate-y-2 -rotate-45' : ''}`}
          />
        </button>
      </nav>

      <div
        onClick={close}
        className={`fixed inset-0 z-40 bg-black/15 transition-opacity duration-300
                    ${open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
      />

      <aside
        className={`fixed top-0 right-0 h-screen w-[230px] bg-white z-50
                    shadow-[-8px_0_30px_rgba(0,0,0,0.08)]
                    pt-[84px] px-6 pb-6
                    flex flex-col
                    transition-transform duration-350
                    ${open ? 'translate-x-0' : 'translate-x-full'}`}
      >
        <div className="flex-1">
          <Show when="signed-out">
            <DrawerLink to="/login" onClose={close}>Sign in</DrawerLink>
          </Show>

          <Show when="signed-in">
            <div className="flex items-center gap-3 py-3 border-b border-gray-100">
              <UserButton afterSignOutUrl="/" />
              <span className="font-ui text-[14px] font-medium text-ink-soft">
                Account
              </span>
            </div>
          </Show>

          <DrawerLink to="/writings" onClose={close}>{essaysLabel}</DrawerLink>
        </div>

        <Show when="signed-in">
          <SignOutButton redirectUrl="/">
            <button
              type="button"
              onClick={close}
              className="block w-full text-left py-3 border-t border-gray-100
                         text-ink-soft hover:text-ink font-ui text-[14px]
                         font-medium transition-colors"
            >
              Log out
            </button>
          </SignOutButton>
        </Show>
      </aside>
    </>
  )
}
