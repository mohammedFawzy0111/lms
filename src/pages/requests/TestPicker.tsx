import { useState } from "react";
import { Field } from "../../components/ui/Field";
import { Segmented } from "../../components/ui/Segmented";
import { money } from "../../lib/format";
import type { ProfileOption, TestOption } from "./types";

interface Props {
  tests: TestOption[];
  profiles: ProfileOption[];
  /** Ids of every selected investigation, whether picked directly or via a profile. */
  selected: Set<string>;
  onToggleTest: (id: string) => void;
  onToggleProfile: (profile: ProfileOption) => void;
}

type Tab = "profiles" | "individual";

export function TestPicker({ tests, profiles, selected, onToggleTest, onToggleProfile }: Props) {
  const [tab, setTab] = useState<Tab>("profiles");

  const total = tests.filter((t) => selected.has(t.id)).reduce((sum, t) => sum + t.cost, 0);
  const isProfileChecked = (p: ProfileOption) =>
    p.investigation_ids.length > 0 && p.investigation_ids.every((id) => selected.has(id));

  return (
    <Field>
      <div className="section-head">
        <span className="field__label">
          Select Tests ({selected.size} selected — {money(total)})
        </span>
        <Segmented<Tab>
          value={tab}
          onChange={setTab}
          options={[
            { value: "profiles", label: "Profiles & Panels" },
            { value: "individual", label: "Individual Tests" },
          ]}
        />
      </div>

      <div className="test-picker">
        {tab === "profiles" ? (
          profiles.length === 0 ? (
            <p className="test-picker__empty">
              No profiles available yet. Switch to Individual Tests, or create one in
              Investigations.
            </p>
          ) : (
            profiles.map((p) => (
              <label key={p.id} className="test-picker__item">
                <input
                  type="checkbox"
                  checked={isProfileChecked(p)}
                  onChange={() => onToggleProfile(p)}
                />
                <span className="grow">
                  <strong>{p.name}</strong>
                  {p.description && <span className="cell-muted"> {p.description}</span>}
                </span>
                <span className="badge-count">
                  {p.test_count} {p.test_count === 1 ? "test" : "tests"}
                </span>
              </label>
            ))
          )
        ) : (
          tests.map((t) => (
            <label key={t.id} className="test-picker__item">
              <input
                type="checkbox"
                checked={selected.has(t.id)}
                onChange={() => onToggleTest(t.id)}
              />
              <span className="cell-id">{t.test_code}</span>
              <span className="grow">{t.test_name}</span>
              <span className="cell-muted">{money(t.cost)}</span>
            </label>
          ))
        )}
      </div>
    </Field>
  );
}
