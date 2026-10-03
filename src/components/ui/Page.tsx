import { ReactNode } from "react";
import "../styles/Page.css";

export interface PageProps {
  title: string;
  subtitle?: string;
  actionBtn?: ReactNode;
  children?: ReactNode;
}

export function Page({ title, subtitle, actionBtn, children }: PageProps) {
  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1 className="page-title">{title}</h1>
          {subtitle && <p className="page-sub">{subtitle}</p>}
        </div>
        {actionBtn && actionBtn}
      </header>

      {children && <main className="page-body">{children}</main>}
    </div>
  );
}
