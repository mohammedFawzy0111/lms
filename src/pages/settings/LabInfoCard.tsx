import { Building2 } from "lucide-react";
import { Card } from "../../components/ui/Card";
import { Field } from "../../components/ui/Field";
import type { SettingsForm } from "./types";

interface Props {
  form: SettingsForm;
  onChange: <K extends keyof SettingsForm>(key: K, value: SettingsForm[K]) => void;
}

export function LabInfoCard({ form, onChange }: Props) {
  return (
    <Card title="Laboratory Information" icon={<Building2 size={14} />}>
      <div className="form-grid">
        <Field label="Laboratory Name" span={2}>
          <input
            className="field__input"
            value={form.lab_name}
            placeholder="My Laboratory"
            onChange={(e) => onChange("lab_name", e.target.value)}
          />
        </Field>
        <Field label="Address" span={2}>
          <input
            className="field__input"
            value={form.lab_address}
            placeholder="123 Medical St"
            onChange={(e) => onChange("lab_address", e.target.value)}
          />
        </Field>
        <Field label="Phone">
          <input
            className="field__input"
            value={form.lab_phone}
            placeholder="+1 555 000 0000"
            onChange={(e) => onChange("lab_phone", e.target.value)}
          />
        </Field>
        <Field label="Email">
          <input
            className="field__input"
            type="email"
            value={form.lab_email}
            placeholder="lab@example.com"
            onChange={(e) => onChange("lab_email", e.target.value)}
          />
        </Field>
      </div>
    </Card>
  );
}
