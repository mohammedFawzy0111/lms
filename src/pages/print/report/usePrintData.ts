import { useEffect, useState } from "react";
import { api, errMsg } from "../../../lib/api";
import type { PrintData } from "./types";

export function usePrintData(requestId: string | undefined) {
  const [data, setData] = useState<PrintData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!requestId) return;
    let live = true;
    api<PrintData>("cmd_get_print_data", { requestId })
      .then((d) => live && setData(d))
      .catch((e) => live && setError(errMsg(e)))
      .finally(() => live && setLoading(false));
    return () => {
      live = false;
    };
  }, [requestId]);

  return { data, loading, error };
}
