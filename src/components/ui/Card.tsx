import type { ReactNode } from "react";

export interface CardProps {
  title: ReactNode;
  /** Small icon shown before the title, tinted with the accent colour. */
  icon?: ReactNode;
  /** Right-aligned control in the header (e.g. a link to the full list). */
  action?: ReactNode;
  children: ReactNode;
}

/** A titled surface that groups related controls. */
export function Card({ title, icon, action, children }: CardProps) {
  return (
    <section className="card">
      <header className="card__top">
        <h3 className="card__header">
          {icon && <span className="card__icon">{icon}</span>}
          {title}
        </h3>
        {action}
      </header>
      {children}
    </section>
  );
}
