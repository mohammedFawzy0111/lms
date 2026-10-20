import { FLAG_INFO, isAbnormal, rangeText, valueText, hasValue, type ResultGroup } from "./helpers";

export function ResultsTable({ group }: { group: ResultGroup }) {
  return (
    <section className="rp-group">
      <h3 className="rp-group__title">{group.name}</h3>
      <table className="rp-table">
        <thead>
          <tr>
            <th className="rp-col-test">Test</th>
            <th className="rp-col-result">Result</th>
            <th className="rp-col-flag">Flag</th>
            <th className="rp-col-unit">Unit</th>
            <th className="rp-col-ref">Reference range</th>
          </tr>
        </thead>
        <tbody>
          {group.items.map((r) => {
            const flag = isAbnormal(r) ? FLAG_INFO[r.flag!] : null;
            return (
              <tr key={r.test_code} className={flag ? `rp-row--${flag.kind}` : undefined}>
                <td>{r.test_name}</td>
                <td className={`rp-result${hasValue(r) ? "" : " rp-result--pending"}`}>
                  {valueText(r)}
                  {r.is_draft && hasValue(r) && <span className="rp-prelim" title="Preliminary"> *</span>}
                </td>
                <td className="rp-flag">
                  {flag && (
                    <>
                      <span aria-hidden>{flag.mark}</span> {flag.label}
                    </>
                  )}
                </td>
                <td className="rp-muted">{r.unit ?? ""}</td>
                <td className="rp-muted">{rangeText(r.ref_min, r.ref_max)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}
