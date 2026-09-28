import { commandRegistry, shortcutFor } from "./commands";
import { type GlobalSettings } from "./settings";
import { type Locale, t } from "../i18n";

export function FoundationSettings({ locale, settings, onChange, status }: { locale: Locale; settings: GlobalSettings; onChange: (changes: Partial<GlobalSettings>) => void; status: "idle" | "saving" | "saved" | "error" }) {
  return <section className="performance-proof" aria-label={t(locale, "settings.title")}>
    <header className="performance-header"><p className="proof-eyebrow">{t(locale, "settings.eyebrow")}</p><h1>{t(locale, "settings.title")}</h1><p>{t(locale, "settings.description")}</p></header>
    <div className="foundation-settings">
      <label><span>{t(locale, "settings.locale")}</span><select value={settings.locale} onChange={(event) => onChange({ locale: event.target.value as Locale })}><option value="cs-CZ">{t(locale, "settings.locale.cs")}</option><option value="en-US">{t(locale, "settings.locale.en")}</option></select></label>
      <label><span>{t(locale, "settings.theme")}</span><select value={settings.themeId} onChange={(event) => onChange({ themeId: event.target.value as GlobalSettings["themeId"] })}><option value="nightfall">{t(locale, "settings.theme.nightfall")}</option><option value="parchment">{t(locale, "settings.theme.parchment")}</option></select></label>
      <label><span>{t(locale, "settings.scale")}</span><input max="150" min="80" onChange={(event) => onChange({ uiScale: Number(event.target.value) })} type="range" value={settings.uiScale} /><strong>{settings.uiScale}%</strong></label>
      <label><input checked={settings.reduceMotion} onChange={(event) => onChange({ reduceMotion: event.target.checked })} type="checkbox" /> {t(locale, "settings.reduceMotion")}</label>
      <label><input checked={settings.muted} onChange={(event) => onChange({ muted: event.target.checked })} type="checkbox" /> {t(locale, "settings.muted")}</label>
      <label><input checked={settings.typewriterSounds} disabled={settings.muted} onChange={(event) => onChange({ typewriterSounds: event.target.checked })} type="checkbox" /> {t(locale, "settings.typewriter")}</label>
    </div>
    <p className="performance-instructions">{t(locale, `settings.status.${status}` as "settings.status.idle")}</p>
    <section className="foundation-commands" aria-label={t(locale, "settings.commands")}><h2>{t(locale, "settings.commands")}</h2>{commandRegistry.map((command) => <div key={command.id}><span>{t(locale, command.labelKey as "command.save")}</span><kbd>{shortcutFor(command, settings)}</kbd></div>)}</section>
  </section>;
}
