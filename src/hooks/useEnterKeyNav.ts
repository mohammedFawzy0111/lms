import { useCallback, KeyboardEvent } from "react";

export const useEnterKeyNav = () => {
  const handleKeyDown = useCallback((e: KeyboardEvent<HTMLElement>) => {
    if (e.key === 'Enter') {
      const container = e.currentTarget;
      const targetElement = e.target as Element;
      const inputs = Array.from(container.querySelectorAll('input, select, textarea'));
      const currentIndex = inputs.indexOf(targetElement);

      if (currentIndex > -1 && currentIndex < inputs.length - 1) {
        const nextInput = inputs[currentIndex + 1];
        if (nextInput instanceof HTMLElement) {
          nextInput.focus();
          e.preventDefault();
        }
      }
    }
  }, []);

  return { onKeyDown: handleKeyDown };
}
