import { type GlobalSettings } from "./settings";

const themes = {
  nightfall: {
    "--ff-workspace": "#18232e",
    "--ff-panel": "#21303d",
    "--ff-document": "#f4eedf",
    "--ff-text-primary": "#f3ead7",
    "--ff-text-secondary": "#b6c1c7",
    "--ff-document-text": "#29261f",
    "--ff-accent": "#be9a62",
    "--ff-border": "#586773",
  },
  parchment: {
    "--ff-workspace": "#ded4c1",
    "--ff-panel": "#f2eadb",
    "--ff-document": "#fffaf0",
    "--ff-text-primary": "#2e2921",
    "--ff-text-secondary": "#615b50",
    "--ff-document-text": "#29261f",
    "--ff-accent": "#765629",
    "--ff-border": "#afa18d",
  },
} as const;

export function applyTheme(settings: Pick<GlobalSettings, "themeId" | "uiScale" | "reduceMotion">) {
  const root = document.documentElement;
  for (const [token, value] of Object.entries(themes[settings.themeId])) root.style.setProperty(token, value);
  root.style.fontSize = `${settings.uiScale}%`;
  root.dataset.reduceMotion = String(settings.reduceMotion);
}
