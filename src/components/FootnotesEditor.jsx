/*
  components/FootnotesEditor.jsx

  Author UI for editing footnote reference texts while writing.
  Markers [^n] live in the body; texts are stored on the post.
*/

export default function FootnotesEditor({ footnotes, onChange, onRemove }) {
  if (!footnotes?.length) return null

  function updateText(id, text) {
    onChange(footnotes.map(f => (f.id === id ? { ...f, text } : f)))
  }

  return (
    <div className="mt-10 pt-8 border-t border-choc-text/15">
      <h2 className="font-ui text-[0.7rem] uppercase tracking-[0.14em]
                    text-choc-soft mb-4">
        Footnotes
      </h2>
      <ul className="space-y-4">
        {footnotes.map(note => (
          <li key={note.id} className="flex gap-3 items-start">
            <span
              className="shrink-0 mt-2.5 font-ui text-choc-accent text-[0.85rem]
                         font-semibold tabular-nums min-w-[1.5rem]"
              aria-hidden
            >
              {note.id}.
            </span>
            <textarea
              value={note.text}
              onChange={e => updateText(note.id, e.target.value)}
              rows={2}
              placeholder="Reference text…"
              className="flex-1 bg-transparent text-choc-soft resize-y outline-none
                         border border-choc-text/15 rounded-lg p-3 text-[1rem]
                         leading-relaxed placeholder:text-choc-soft/35
                         focus:border-choc-accent/50 transition-colors font-ui"
            />
            <button
              type="button"
              onClick={() => onRemove?.(note.id)}
              className="shrink-0 mt-1 font-ui text-[0.72rem] font-semibold
                         px-2.5 py-1.5 rounded-full text-[#e8a98c]
                         border border-[#e8a98c]/35 hover:bg-white/10 transition-colors"
              title="Remove footnote"
            >
              Remove
            </button>
          </li>
        ))}
      </ul>
      <p className="mt-3 font-ui text-[0.7rem] text-choc-soft/55">
        Superscript markers like [^1] in the essay link here.
      </p>
    </div>
  )
}
