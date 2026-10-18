import { Globe } from "lucide-react";
import { Card } from "../../components/ui/Card";
import { Field } from "../../components/ui/Field";
import { CURRENCIES, DATE_FORMATS } from "./constants";
import type { SettingsForm } from "./types";

interface Props {
  form: SettingsForm;
  onChange: <K extends keyof SettingsForm>(key: K, value: SettingsForm[K]) => void;
}

export function RegionalCard({ form, onChange }: Props) {
  return (
    <Card title="Regional Settings" icon={<Globe size={14} />}>
      <div className="form-grid">
        <Field label="Currency">
          <select className="field__input" value={form.currency} onChange={(e) => onChange("currency", e.target.value)}>
            {CURRENCIES.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </Field>
        <Field label="Date Format">
          <select className="field__input" value={form.date_format} onChange={(e) => onChange("date_format", e.target.value)}>
            {DATE_FORMATS.map((f) => (
              <option key={f} value={f}>{f}</option>
            ))}
          </select>
        </Field>
      </div>
    </Card>
  );
}
