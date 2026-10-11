import { useRef, useState } from "react";
import type { MouseEvent, WheelEvent } from "react";
import "../styles/CatTabs.css";

export interface CatTabsProps {
  categories: string[];
  categoriesLabels: Record<string, string>;
  onSelect?: (value: string) => void;
}

export function CatTabs({
  categories,
  categoriesLabels,
  onSelect,
}: CatTabsProps) {
  const [selected, setSelected] = useState<string>("");
  const listRef = useRef<HTMLDivElement>(null);

  const select = (value: string, e: MouseEvent<HTMLButtonElement>) => {
    setSelected(value);
    onSelect?.(value);
    // keep the clicked tab visible when the list overflows
    e.currentTarget.scrollIntoView({
      behavior: "smooth",
      inline: "nearest",
      block: "nearest",
    });
  };

  // let a normal mouse wheel scroll the tabs horizontally
  const onWheel = (e: WheelEvent<HTMLDivElement>) => {
    const el = listRef.current;
    if (!el || el.scrollWidth <= el.clientWidth) return;
    if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) el.scrollLeft += e.deltaY;
  };

  const tab = (value: string, label: string) => (
    <button
      key={value}
      type="button"
      role="tab"
      aria-selected={selected === value}
      className={`cat-tab ${selected === value ? "cat-tab--active" : ""}`}
      onClick={(e) => select(value, e)}
    >
      {label}
    </button>
  );

  return (
    <div className="cat-tabs" role="tablist" ref={listRef} onWheel={onWheel}>
      {tab("", "All")}
      {categories.map((s) => tab(s, categoriesLabels[s] ?? s))}
    </div>
  );
}
