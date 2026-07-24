/*
  pages/Landing.jsx — page 1.

  Full-screen, centered. The sentence uses the handwriting font.
  Only "write" is a link — styled to be clearly clickable, but not
  screaming. The name is just italic, not colored, not clickable.

  overflow-hidden here means the user physically cannot scroll to
  /writings — they have to click the link.
*/

import { Link } from 'react-router-dom'

export default function Landing() {
  return (
    <section
      className="h-screen overflow-hidden bg-grad-landing
                 flex items-center justify-center text-center px-6 pt-16"
    >
      <p
        className="landing-line font-hand text-ink leading-snug
                   text-[clamp(2.2rem,6vw,4.6rem)] max-w-[18ch]"
      >
        I am{' '}
        {/* Name: italic only, same size, same color — not clickable */}
        <span className="italic">Dynamique Twizere</span>. I think therefore I{' '}
        {/*
          "write" — the only link.
          Underlined, accent-colored, same font/size as the rest.
          Hover dims slightly — keeps it light, not garish.
        */}
        <Link
          to="/writings"
          className="text-accent-str underline underline-offset-[6px]
                     decoration-2 decoration-accent-str
                     hover:opacity-75 transition-opacity"
        >
          write
        </Link>
        .
      </p>
    </section>
  )
}
