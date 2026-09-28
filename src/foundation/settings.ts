import { invoke } from "@tauri-apps/api/core";
import { type Locale } from "../i18n";

export type GlobalSettings = {
  locale: Locale;
  themeId: "nightfall" | "parchment";
  uiScale: number;
  reduceMotion: boolean;
  muted: boolean;
  typewriterSounds: boolean;
  shortcutOverrides: Record<string, string>;
};

export const defaultGlobalSettings: GlobalSettings = {
  locale: "cs-CZ",
  themeId: "nightfall",
  uiScale: 100,
  reduceMotion: false,
  muted: false,
  typewriterSounds: false,
  shortcutOverrides: {},
};

export function loadGlobalSettings() {
  return invoke<GlobalSettings>("load_global_settings");
}

export function saveGlobalSettings(settings: GlobalSettings) {
  return invoke("save_global_settings", { settings });
}
