import { Moon, Sun } from "lucide-react";
import { Card } from "../../components/ui/Card";
import { useSettingsStore } from "../../stores/settingsStore";

type Theme = "dark" | "light";

function ThemeOption({ theme, active, onClick }: { theme: Theme; active: boolean; onClick: () => void }) {
  return (
    <button
      className={`theme-card${active ? " theme-card--active" : ""}`}
      onClick={onClick}
      aria-pressed={active}
    >
      <div className={`theme-card__preview theme-card__preview--${theme}`}>
        <i /><i /><i /><i />
      </div>
      <div className="theme-card__label">
        {theme === "dark" ? "Dark" : "Light"} {active && "✓"}
      </div>
    </button>
  );
}

/** Theme applies immediately; it is not part of the "Save Changes" form. */
export function AppearanceCard() {
  const theme = useSettingsStore((s) => s.settings?.theme);
  const setTheme = useSettingsStore((s) => s.setTheme);
  const isDark = theme !== "light";

  return (
    <Card title="Appearance" icon={isDark ? <Moon size={14} /> : <Sun size={14} />}>
      <div className="theme-options">
        <ThemeOption theme="dark" active={isDark} onClick={() => setTheme("dark")} />
        <ThemeOption theme="light" active={!isDark} onClick={() => setTheme("light")} />
      </div>
    </Card>
  );
}
