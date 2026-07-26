/*
  components/comments/CommentsVisibilityToggle.jsx
*/

export default function CommentsVisibilityToggle({ checked, onChange }) {
  return (
    <label
      className="inline-flex items-center gap-2 cursor-pointer select-none font-ui"
      data-comment-ui=""
    >
      <span className="text-[0.78rem] text-choc-soft">Show comments</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label="Show comments"
        onClick={() => onChange?.(!checked)}
        className={`relative h-5 w-9 rounded-full transition-colors
                    ${checked ? 'bg-choc-accent' : 'bg-white/20'}`}
      >
        <span
          className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-choc-deep
                      transition-transform ${checked ? 'translate-x-4' : 'translate-x-0'}`}
        />
      </button>
    </label>
  )
}
