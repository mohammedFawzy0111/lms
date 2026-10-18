import { useCallback, useEffect, useState } from "react";
import { Page } from "../components/ui/Page";
import { Tab, Tabs } from "../components/ui/Tabs";
import { api, errMsg } from "../lib/api";
import { useAuthStore } from "../stores/authStore";
import { IndividualTests } from "./investigations/IndividualTests";
import { InvestigationFormModal } from "./investigations/InvestigationFormModal";
import { ProfilesView } from "./investigations/ProfilesView";
import { ReferenceRangesModal } from "./investigations/ReferenceRangesModal";
import { useInvestigationList } from "./investigations/useInvestigationList";
import type { Category, Investigation, Profile } from "./investigations/types";

export default function Investigations() {
  const actorId = useAuthStore((s) => s.session?.user.id ?? "");
  const [view, setView] = useState<"tests" | "profiles">("tests");
  const [categories, setCategories] = useState<Category[]>([]);
  const [showForm, setShowForm] = useState<Investigation | null | "new">(null);
  const [rangesFor, setRangesFor] = useState<Investigation | null>(null);
  const [showProfileForm, setShowProfileForm] = useState<Profile | null | "new">(null);
  const list = useInvestigationList();

  const loadCategories = useCallback(async () => {
    try {
      setCategories(await api<Category[]>("cmd_list_categories"));
    } catch (e) {
      list.setError(errMsg(e));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  return (
    <Page
      title="Investigation"
      actionBtn={
        <button
          className="save-btn"
          onClick={() => (view === "tests" ? setShowForm("new") : setShowProfileForm("new"))}
        >
          {view === "tests" ? "+ New Test" : "+ New Profile"}
        </button>
      }
    >
      <Tabs>
        <Tab
          title="Individual Tests"
          onActive={() => setView("tests")}
          element={
            <IndividualTests
              categories={categories}
              list={list}
              onEdit={setShowForm}
              onRanges={setRangesFor}
            />
          }
        />
        <Tab
          title="Profiles & Panels"
          onActive={() => setView("profiles")}
          element={
            <ProfilesView
              actorId={actorId}
              showForm={showProfileForm}
              setShowForm={setShowProfileForm}
            />
          }
        />
      </Tabs>

      {list.error && <div className="error">{list.error}</div>}

      {showForm && (
        <InvestigationFormModal
          investigation={showForm === "new" ? null : showForm}
          categories={categories}
          actorId={actorId}
          onClose={() => setShowForm(null)}
          onSaved={() => {
            list.reload();
            loadCategories();
          }}
          onCategoryCreated={loadCategories}
        />
      )}

      {rangesFor && (
        <ReferenceRangesModal investigation={rangesFor} onClose={() => setRangesFor(null)} />
      )}
    </Page>
  );
}
