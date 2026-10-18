import { useCallback, useEffect, useRef, useState } from "react";

export interface Flash {
  type: "success" | "error";
  text: string;
}

/** A message that clears itself after `ms` (errors stay until replaced). */
export function useFlash(ms = 3000) {
  const [flash, setFlash] = useState<Flash | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const show = useCallback(
    (type: Flash["type"], text: string) => {
      clearTimeout(timer.current);
      setFlash({ type, text });
      if (type === "success") timer.current = setTimeout(() => setFlash(null), ms);
    },
    [ms],
  );
  const clear = useCallback(() => {
    clearTimeout(timer.current);
    setFlash(null);
  }, []);

  useEffect(() => () => clearTimeout(timer.current), []);

  return { flash, show, clear };
}
