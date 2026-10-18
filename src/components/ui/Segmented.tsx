import type { ReactNode } from "react";

export interface SegmentedProps<T extends string> {
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: ReactNode }[];
}

/** Small two-to-four way switch for swapping a view inside a form or modal. */
export function Segmented<T extends string>({ value, onChange, options }: SegmentedProps<T>) {
  return (
    <div className="segmented" role="tablist">
    {options.map((o) => (
      <button
      key={o.value}
      type="button"
      role="tab"
      aria-selected={o.value === value}
      className={`segmented__item${o.value === value ? " segmented__item--active" : ""}`}
      onClick={() => onChange(o.value)}
      >
      {o.label}
      </button>
    ))}
    </div>
  );
}
