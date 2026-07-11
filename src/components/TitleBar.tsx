import { getCurrentWindow } from "@tauri-apps/api/window";
import { Minus, Square, X, Microscope } from "lucide-react";
import { useSettingsStore } from "../stores/settingsStore";
import "./TitleBar.css";


const appWindow = getCurrentWindow();
appWindow.isClosable
export default function TitleBar() {
  const settings = useSettingsStore((s) => s.settings);

  return (
    <div className="titlebar" data-tauri-drag-region>
      <div className="titlebar__left" data-tauri-drag-region>
        <div className="titlebar__logo">
          <Microscope size={13} />
        </div>
        <span className="titlebar__name" data-tauri-drag-region>
          {settings?.lab_name ?? "LMS"}
        </span>
      </div>

      <div className="titlebar__controls">
        <button
          className="titlebar__btn"
          onClick={async () => await appWindow.minimize()}
          title="Minimize"
        >
          <Minus size={12} />
        </button>
        <button
          className="titlebar__btn"
          onClick={async () => await appWindow.toggleMaximize()}
          title="Maximize"
        >
          <Square size={11} />
        </button>
        <button
          className="titlebar__btn titlebar__btn--close"
          onClick={async () => {
            console.log("clicked");
            await appWindow.close();
            console.log("after close");
          }}
          title="Close"
        >
          <X size={12} />
        </button>
      </div>
    </div>
  );
}
