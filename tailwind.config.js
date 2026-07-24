/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      // ── Fonts ──────────────────────────────────────────────────────────
      fontFamily: {
        display: ['Fraunces', 'Georgia', 'serif'],
        ui:      ['Manrope', 'system-ui', 'sans-serif'],
        hand:    ['Patrick Hand', 'cursive'],
      },

      // ── Colors ─────────────────────────────────────────────────────────
      colors: {
        ink:          '#221f2c',
        'ink-soft':   '#534f60',
        accent:       '#8b7cf6',
        'accent-str': '#6f5ce0',
        // chocolate world (blog post page)
        choc: {
          bg:     '#3b2417',
          deep:   '#2c1a10',
          text:   '#f1e3cc',
          soft:   '#cdb89a',
          accent: '#c98a4b',
        },
        // gradient stops (used in backgroundImage below)
        grad: {
          a: '#f4f2ff',
          b: '#e3e9ff',
          c: '#fce8e6',
        },
      },

      // ── Gradient backgrounds ────────────────────────────────────────────
      backgroundImage: {
        'grad-landing': 'linear-gradient(135deg, #f4f2ff 0%, #e3e9ff 55%, #fce8e6 100%)',
        'grad-blog':    'linear-gradient(160deg, #fce8e6 0%, #f4f2ff 45%, #e3e9ff 100%)',
        'grad-post':    'linear-gradient(180deg, #3b2417 0%, #2c1a10 100%)',
      },

      // ── Shadows ─────────────────────────────────────────────────────────
      boxShadow: {
        card:       '0 10px 30px rgba(80,70,140,0.12)',
        'card-hover':'0 18px 40px rgba(80,70,140,0.20)',
      },
    },
  },
  plugins: [],
}
