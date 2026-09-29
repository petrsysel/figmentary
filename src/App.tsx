import { useEffect, useState } from "react";
import { Library } from "./library/Library";
import { Workspace } from "./workspace/Workspace";
import { defaultGlobalSettings, loadGlobalSettings, type GlobalSettings } from "./foundation/settings";
import { applyTheme } from "./foundation/themes";
import "./App.css";

function App() {
  const [settings, setSettings] = useState<GlobalSettings>(defaultGlobalSettings);
  const [openStoryId, setOpenStoryId] = useState<string>();

  useEffect(() => {
    void loadGlobalSettings().then(setSettings).catch(() => undefined);
  }, []);

  useEffect(() => {
    applyTheme(settings);
  }, [settings]);

  return (
    <main className={`app-shell${openStoryId ? " app-shell--workspace" : " app-shell--library"}`}>
      {openStoryId ? <Workspace locale={settings.locale} onExit={() => setOpenStoryId(undefined)} storyId={openStoryId} /> : <Library locale={settings.locale} onOpen={setOpenStoryId} />}
    </main>
  );
}

export default App;
