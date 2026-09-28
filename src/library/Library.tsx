import { invoke } from "@tauri-apps/api/core";
import { useEffect, useState } from "react";
import { type Locale, t } from "../i18n";

type StorySummary = { id: string; title: string; createdAt: number; updatedAt: number; lastOpenedAt?: number };
type LibraryView = "cover" | "shelf";

function formattedDate(timestamp: number | undefined, locale: Locale) {
  return timestamp ? new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(new Date(timestamp * 1000)) : "—";
}

export function Library({ locale }: { locale: Locale }) {
  const [stories, setStories] = useState<StorySummary[]>([]);
  const [title, setTitle] = useState("");
  const [view, setView] = useState<LibraryView>("cover");
  const [status, setStatus] = useState<"idle" | "working" | "error">("idle");

  const refresh = async () => setStories(await invoke<StorySummary[]>("list_stories"));
  useEffect(() => { void refresh().catch(() => setStatus("error")); }, []);
  const create = async () => {
    setStatus("working");
    try { await invoke<StorySummary>("create_story", { title }); setTitle(""); await refresh(); setStatus("idle"); } catch { setStatus("error"); }
  };
  const open = async (id: string) => {
    setStatus("working");
    try { await invoke<StorySummary>("open_story", { id }); await refresh(); setStatus("idle"); } catch { setStatus("error"); }
  };

  return <section className="library" aria-label={t(locale, "library.title")}>
    <header className="performance-header"><p className="proof-eyebrow">{t(locale, "library.eyebrow")}</p><h1>{t(locale, "library.title")}</h1><p>{t(locale, "library.description")}</p></header>
    <form className="library-new" onSubmit={(event) => { event.preventDefault(); void create(); }}><label><span>{t(locale, "library.new.label")}</span><input onChange={(event) => setTitle(event.target.value)} placeholder={t(locale, "library.new.placeholder")} value={title} /></label><button disabled={!title.trim() || status === "working"} type="submit">{t(locale, "library.new.action")}</button></form>
    <div className="library-views"><span>{t(locale, "library.view")}</span><button aria-pressed={view === "cover"} onClick={() => setView("cover")} type="button">{t(locale, "library.cover")}</button><button aria-pressed={view === "shelf"} onClick={() => setView("shelf")} type="button">{t(locale, "library.shelf")}</button></div>
    {status === "error" && <p className="proof-error">{t(locale, "library.error")}</p>}
    {stories.length === 0 ? <p className="performance-instructions">{t(locale, "library.empty")}</p> : <div className={`library-stories is-${view}`}>{stories.map((story) => <article className="library-story" key={story.id}><div className="library-book"><span>{story.title}</span></div><div><h2>{story.title}</h2><p>{t(locale, "library.opened", { date: formattedDate(story.lastOpenedAt, locale) })}</p><button disabled={status === "working"} onClick={() => void open(story.id)} type="button">{t(locale, "library.open")}</button></div></article>)}</div>}
  </section>;
}
