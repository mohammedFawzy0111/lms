import type { ReactNode } from "react";

// A column bound to a real field of the row. `cell` is optional.
type DataColumn<T> = {
  key: keyof T & string;
  header?: ReactNode;
  cell?: (row: T) => ReactNode;
  className?: string;
};

// A column with no matching field (e.g. "actions"). `cell` is required.
type DisplayColumn<T> = {
  key: string;
  header?: ReactNode;
  cell: (row: T) => ReactNode;
  className?: string;
};

export type Column<T> = DataColumn<T> | DisplayColumn<T>;

type DataTableProps<T extends object> = {
  rows: T[];
  columns?: Column<T>[];
  loadingState?: boolean;
  getRowKey?: (row: T, index: number) => string | number;
  rowClassName?: (row: T, index: number) => string | undefined;
  wrapperClassName?: string;
  tableClassName?: string;
  emptyState?: ReactNode;
  caption?: ReactNode;
  sticky?: boolean;
};

function render(value: unknown): ReactNode {
  if (value == null) return "";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

export function DataTable<T extends object>({
  rows,
  columns,
  loadingState = false,
  getRowKey = (_, i) => i,
  rowClassName,
  wrapperClassName,
  tableClassName,
  emptyState,
  caption,
  sticky = true,
}: DataTableProps<T>) {
  const cols: Column<T>[] =
    columns ??
    Array.from(new Set(rows.flatMap((r) => Object.keys(r)))).map(
      (k) => ({ key: k }) as Column<T>,
    );

  const tableCls = ["table", tableClassName].filter(Boolean).join(" ");
  const wrapperCls = ["table-wrap", wrapperClassName].filter(Boolean).join(" ");

  const thStyle = sticky
    ? ({ position: "sticky", top: 0, zIndex: 1 } as const)
    : undefined;

  return (
    <div className={wrapperCls}>
      {loadingState ? (
        <div className="loading">Loading...</div>
      ) : rows.length === 0 ? (
        <div className="empty">{emptyState ?? "No data found."}</div>
      ) : (
        <table className={tableCls}>
          {caption !== undefined && <caption>{caption}</caption>}
          <thead>
            <tr>
              {cols.map((c) => (
                <th key={c.key} className={c.className} style={thStyle}>
                  {c.header ?? c.key}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={getRowKey(row, i)} className={rowClassName?.(row, i)}>
                {cols.map((c) => (
                  <td key={c.key} className={c.className}>
                    {c.cell
                      ? c.cell(row)
                      : render((row as unknown as Record<string, unknown>)[c.key])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
