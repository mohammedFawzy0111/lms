import { useCallback, useState } from "react";
import type { Margins, PrintMode } from "./types";

const KEY = "lms-print-layout";

/** Margins (mm) of the plain, full-report page. */
export const FULL_MARGINS: Margins = { top: 14, bottom: 14, left: 15, right: 15 };

/** Starting margins for preprinted paper: room for a letterhead above and a footer below. */
export const TEMPLATE_DEFAULTS: Margins = { top: 42, bottom: 30, left: 15, right: 15 };

interface Saved {
  mode: PrintMode;
  template: Margins;
}

function read(): Saved {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? "null");
    if (raw && (raw.mode === "full" || raw.mode === "template")) {
      return { mode: raw.mode, template: { ...TEMPLATE_DEFAULTS, ...raw.template } };
    }
  } catch {
    /* ignore a missing or corrupt value */
  }
  return { mode: "full", template: TEMPLATE_DEFAULTS };
}

/**
 * Print mode and the preprinted-paper margins. Stored on this computer (not in the lab's
 * database) because they depend on the printer and the paper sitting in it.
 */
export function usePrintLayout() {
  const [saved, setSaved] = useState<Saved>(read);

  const update = useCallback((next: Saved) => {
    setSaved(next);
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      /* storage unavailable: the choice just won't be remembered */
    }
  }, []);

  const setMode = (mode: PrintMode) => update({ ...saved, mode });
  const setTemplateMargin = (side: keyof Margins, mm: number) =>
    update({ ...saved, template: { ...saved.template, [side]: Math.min(100, Math.max(0, mm || 0)) } });
  const resetTemplate = () => update({ ...saved, template: TEMPLATE_DEFAULTS });

  const margins = saved.mode === "template" ? saved.template : FULL_MARGINS;

  return { mode: saved.mode, margins, setMode, setTemplateMargin, resetTemplate };
}
