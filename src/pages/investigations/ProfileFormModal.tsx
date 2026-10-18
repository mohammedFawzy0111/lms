import { useEffect, useState } from "react";
import { Field } from "../../components/ui/Field";
import { Modal } from "../../components/ui/Modal";
import { api, errMsg } from "../../lib/api";
import type { Investigation, NewProfile, Profile, ProfileWithTests } from "./types";

interface Props {
  /** null = create a new profile */
  profile: Profile | null;
  actorId: string;
  onClose: () => void;
  onSaved: () => void;
}

export function ProfileFormModal({ profile, actorId, onClose, onSaved }: Props) {
  const isEdit = !!profile;
  const [name, setName] = useState(profile?.name ?? "");
  const [description, setDescription] = useState(profile?.description ?? "");
  const [allTests, setAllTests] = useState<Investigation[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [tests, detail] = await Promise.all([
          api<Investigation[]>("cmd_list_investigations", {
            categoryId: null,
            search: null,
            includeInactive: false,
          }),
          profile
            ? api<ProfileWithTests>("cmd_get_profile", { id: profile.id })
            : Promise.resolve(null),
        ]);
        if (cancelled) return;
        setAllTests(tests);
        if (detail) setSelected(new Set(detail.investigation_ids));
      } catch (e) {
        if (!cancelled) setError(errMsg(e));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [profile]);

  function toggleTest(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function submit() {
    setSaving(true);
    setError(null);
    const payload: NewProfile = {
      name,
      description: description || null,
      investigation_ids: Array.from(selected),
    };
    try {
      if (profile) await api("cmd_update_profile", { actorId, id: profile.id, profile: payload });
      else await api("cmd_create_profile", { actorId, profile: payload });
      onSaved();
      onClose();
    } catch (e) {
      setError(errMsg(e));
      setSaving(false);
    }
  }

  return (
    <Modal
      size="wide"
      title={profile ? `Edit Profile — ${profile.name}` : "New Profile / Panel"}
      onClose={onClose}
      footer={
        <>
          <button className="action-btn" onClick={onClose}>Cancel</button>
          <button
            className="save-btn"
            onClick={submit}
            disabled={saving || !name.trim() || selected.size === 0}
          >
            {saving ? "Saving..." : isEdit ? "Save Changes" : "Create Profile"}
          </button>
        </>
      }
    >
      <div className="stack">
        {error && <div className="error">{error}</div>}

        <div className="modal-grid">
          <Field label="Profile Name *">
            <input
              className="field__input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="CBC"
            />
          </Field>
          <Field label="Description">
            <input
              className="field__input"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Complete Blood Count"
            />
          </Field>
        </div>

        <Field label={`Select Tests (${selected.size} selected)`}>
          <div className="test-picker">
            {allTests.map((t) => (
              <label key={t.id} className="test-picker__item">
                <input
                  type="checkbox"
                  checked={selected.has(t.id)}
                  onChange={() => toggleTest(t.id)}
                />
                <span className="font-mono cell-muted">{t.test_code}</span>
                <span>{t.test_name}</span>
              </label>
            ))}
          </div>
        </Field>
      </div>
    </Modal>
  );
}
