import { useEffect, useState } from "react";
import { Library } from "./library/Library";
import { defaultGlobalSettings, loadGlobalSettings, type GlobalSettings } from "./foundation/settings";
import { applyTheme } from "./foundation/themes";
import "./App.css";

function App() {
  const [settings, setSettings] = useState<GlobalSettings>(defaultGlobalSettings);

  useEffect(() => {
    void loadGlobalSettings().then(setSettings).catch(() => undefined);
  }, []);

  useEffect(() => {
    applyTheme(settings);
  }, [settings]);

  return (
    <main className="app-shell">
      <Library locale={settings.locale} />
    </main>
  );
}

export default App;
