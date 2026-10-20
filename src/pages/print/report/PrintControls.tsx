import type { Margins, PrintMode } from "./types";

export function ModeSwitch({ mode, onChange }: { mode: PrintMode; onChange: (m: PrintMode) => void }) {
  const options: [PrintMode, string][] = [
    ["full", "Full report"],
    ["template", "Preprinted paper"],
  ];
  return (
    <div className="print-switch" role="group" aria-label="Paper type">
      {options.map(([value, label]) => (
        <button
          key={value}
          className={`print-switch__btn${mode === value ? " print-switch__btn--on" : ""}`}
          aria-pressed={mode === value}
          onClick={() => onChange(value)}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

const SIDES: [keyof Margins, string][] = [
  ["top", "Top"],
  ["bottom", "Bottom"],
  ["left", "Left"],
  ["right", "Right"],
];

/** Margin inputs for preprinted paper, in millimetres. */
export function MarginControls({
  margins,
  onChange,
  onReset,
}: {
  margins: Margins;
  onChange: (side: keyof Margins, mm: number) => void;
  onReset: () => void;
}) {
  return (
    <>
      <span className="print-hint">Leave space for your letterhead (mm):</span>
      {SIDES.map(([side, label]) => (
        <label key={side} className="print-margin">
          {label}
          <input
            type="number"
            min={0}
            max={100}
            value={margins[side]}
            onChange={(e) => onChange(side, e.target.valueAsNumber)}
          />
        </label>
      ))}
      <button className="print-btn print-btn--small" onClick={onReset}>Reset</button>
    </>
  );
}
