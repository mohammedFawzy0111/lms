import { useEffect } from "react";
import type { ReactNode } from "react";

export interface ModalProps {
  title: ReactNode;
  onClose: () => void;
  children: ReactNode;
  /** Buttons for the footer row. Omit for a modal without one. */
  footer?: ReactNode;
  size?: "sm" | "md" | "wide";
}

const SIZE_CLASS = { sm: " modal--sm", md: "", wide: " modal--wide" } as const;

/**
 * Shared dialog. Render it conditionally (`{open && <Modal ... />}`).
 * Closes on Escape and on a click that both starts and ends on the backdrop,
 * so dragging a text selection out of an input doesn't dismiss it.
 */
export function Modal({ title, onClose, children, footer, size = "md" }: ModalProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
    className="modal-backdrop"
    onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
    <div
    className={`modal${SIZE_CLASS[size]}`}
    role="dialog"
    aria-modal="true"
    >
    <div className="modal__header">{title}</div>
    <div className="modal__body">{children}</div>
    {footer && <div className="modal__footer">{footer}</div>}
    </div>
    </div>
  );
}
