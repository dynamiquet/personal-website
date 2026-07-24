/*
  components/EditToolbar.jsx

  Author-only toolbar shown while editing an essay.
  Controls: body font, text size, alignment, footer panel toggle,
  plus Save / Delete / Reading mode.
*/

import { BODY_FONTS, TEXT_SIZES } from '../utils/helpers'

function Segment({ options, value, onChange, ariaLabel }) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className="inline-flex rounded-full border border-white/20 bg-white/5 p-0.5"
    >
      {options.map(opt => {
        const active = value === opt.id
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => onChange(opt.id)}
            className={`font-ui text-[0.72rem] font-semibold px-2.5 py-1.5 rounded-full
                        transition-colors
                        ${active
                          ? 'bg-choc-accent text-choc-deep'
                          : 'text-choc-soft hover:text-choc-text hover:bg-white/10'
                        }`}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}

function ToolBtn({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`font-ui text-[0.72rem] font-semibold px-3 py-1.5 rounded-full
                  border transition-colors
                  ${active
                    ? 'bg-choc-accent/25 border-choc-accent text-choc-text'
                    : 'bg-white/5 border-white/20 text-choc-soft hover:text-choc-text hover:bg-white/10'
                  }`}
    >
      {children}
    </button>
  )
}

export default function EditToolbar({
  wordCount,
  bodyFont,
  textSize,
  align,
  showFooter,
  onBodyFont,
  onTextSize,
  onAlign,
  onToggleFooter,
  onReadingMode,
  onDelete,
  onSave,
}) {
  return (
    <div className="max-w-[880px] mx-auto mb-6 space-y-3">
      <div className="flex flex-wrap items-center gap-2 gap-y-2">
        <span className="font-ui text-[0.65rem] uppercase tracking-[0.12em]
                         text-choc-soft/80 mr-0.5">
          Font
        </span>
        <Segment
          ariaLabel="Body font"
          options={BODY_FONTS}
          value={bodyFont}
          onChange={onBodyFont}
        />

        <span className="font-ui text-[0.65rem] uppercase tracking-[0.12em]
                         text-choc-soft/80 ml-1 mr-0.5">
          Size
        </span>
        <Segment
          ariaLabel="Text size"
          options={TEXT_SIZES}
          value={textSize}
          onChange={onTextSize}
        />

        <span className="font-ui text-[0.65rem] uppercase tracking-[0.12em]
                         text-choc-soft/80 ml-1 mr-0.5">
          Align
        </span>
        <Segment
          ariaLabel="Text alignment"
          options={[
            { id: 'left',   label: 'Left' },
            { id: 'center', label: 'Center' },
          ]}
          value={align}
          onChange={onAlign}
        />

        <ToolBtn active={showFooter} onClick={onToggleFooter}>
          Footer
        </ToolBtn>

        <span className="ml-auto font-ui text-choc-soft text-xs tabular-nums">
          {wordCount} words
        </span>
      </div>

      <div className="flex items-center gap-2 justify-end">
        <button
          type="button"
          onClick={onReadingMode}
          className="font-ui text-[0.8rem] font-semibold px-4 py-2 rounded-full
                     bg-white/10 text-choc-text border border-white/25
                     hover:bg-white/20 transition-colors"
        >
          Reading mode
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="font-ui text-[0.8rem] font-semibold px-4 py-2 rounded-full
                     text-[#e8a98c] border border-[#e8a98c]/40
                     hover:bg-white/10 transition-colors"
        >
          Delete
        </button>
        <button
          type="button"
          onClick={onSave}
          className="font-ui text-[0.8rem] font-semibold px-4 py-2 rounded-full
                     bg-choc-accent text-choc-deep border-choc-accent
                     hover:opacity-90 transition-opacity"
        >
          Save
        </button>
      </div>
    </div>
  )
}
