import { useEffect, useState } from "react";
import { api } from "../../../lib/api";
import type { PrintData } from "./types";

export interface LoadedReport {
  id: string;
  data: PrintData;
}

/** Loads one or many reports. One failing request doesn't blank the others. */
export function usePrintData(ids: string[]) {
  const key = ids.join(","); // stable dependency; a fresh array every render would re-run the effect
  const [items, setItems] = useState<LoadedReport[]>([]);
  const [failed, setFailed] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const list = key ? key.split(",") : [];
    if (list.length === 0) {
      setLoading(false);
      return;
    }
    let live = true;
    setLoading(true);
    Promise.allSettled(
      list.map((requestId) =>
        api<PrintData>("cmd_get_print_data", { requestId }),
      ),
    )
      .then((res) => {
        if (!live) return;
        const ok: LoadedReport[] = [];
        const bad: string[] = [];
        res.forEach((r, i) => {
          if (r.status === "fulfilled") ok.push({ id: list[i], data: r.value });
          else bad.push(list[i]);
        });
        setItems(ok);
        setFailed(bad);
      })
      .finally(() => live && setLoading(false));
    return () => {
      live = false;
    };
  }, [key]);

  return { items, failed, loading };
}
