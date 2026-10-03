import { useState } from "react";
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
  const [statusFilter, setStatusFilter] = useState<string>("");

  return (
    <div className="cat-tabs">
      <button
        className={`cat-tab ${statusFilter === "" ? "cat-tab--active" : ""}`}
        onClick={() => {
          setStatusFilter("");
          onSelect && onSelect(statusFilter);
        }}
      >
        All
      </button>
      {categories.map((s) => (
        <button
          key={s}
          className={`cat-tab ${statusFilter === s ? "cat-tab--active" : ""}`}
          onClick={() => {
            setStatusFilter(s);
            onSelect && onSelect(statusFilter);
          }}
        >
          {categoriesLabels[s]}
        </button>
      ))}
    </div>
  );
}
