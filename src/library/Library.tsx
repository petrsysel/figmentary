import { useEffect, useState } from "react";
import { type Locale, t } from "../i18n";
import { storyApi, type StorySummary } from "../services/storyApi";

type LibraryView = "cover" | "shelf";
type TransferNotice = { kind: "imported" | "exported" | "invalid" | "newer" | "exists" | "error"; title?: string };

const noticeKeys = {
  imported: "library.imported",
  exported: "library.exported",
  invalid: "library.invalidStory",
  newer: "library.newerStory",
  exists: "library.fileExists",
  error: "library.transferError",
} as const;

function formattedDate(timestamp: number | null, locale: Locale) {
  return timestamp ? new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(new Date(timestamp * 1000)) : "—";
}

function transferFailure(error: unknown): TransferNotice["kind"] {
  switch (String(error)) {
    case "INVALID_STORY": return "invalid";
    case "NEWER_STORY": return "newer";
    case "FILE_EXISTS": return "exists";
    default: return "error";
  }
}

export function Library({ locale, onOpen }: { locale: Locale; onOpen: (id: string) => void }) {
  const [stories, setStories] = useState<StorySummary[]>([]);
  const [title, setTitle] = useState("");
  const [view, setView] = useState<LibraryView>("cover");
  const [status, setStatus] = useState<"idle" | "working" | "error">("idle");
  const [notice, setNotice] = useState<TransferNotice>();

  const refresh = async () => setStories(await storyApi.list());
  useEffect(() => { void refresh().catch(() => setStatus("error")); }, []);
  const create = async () => {
    setStatus("working"); setNotice(undefined);
    try { await storyApi.create(title); setTitle(""); await refresh(); setStatus("idle"); } catch { setStatus("error"); }
  };
  const open = async (id: string) => {
    setStatus("working"); setNotice(undefined);
    try { await storyApi.open(id); await refresh(); setStatus("idle"); onOpen(id); } catch { setStatus("error"); }
  };
  const importStory = async () => {
    setStatus("working"); setNotice(undefined);
    try {
      const imported = await storyApi.import();
      if (imported) { await refresh(); setNotice({ kind: "imported", title: imported.title }); }
    } catch (error) { setNotice({ kind: transferFailure(error) }); }
    setStatus("idle");
  };
  const exportStory = async (story: StorySummary) => {
    setStatus("working"); setNotice(undefined);
    try {
      if (await storyApi.export(story.id)) setNotice({ kind: "exported", title: story.title });
    } catch (error) { setNotice({ kind: transferFailure(error) }); }
    setStatus("idle");
  };

  return <section className="library" aria-label={t(locale, "library.title")}>
    <header className="performance-header"><p className="proof-eyebrow">{t(locale, "library.eyebrow")}</p><h1>{t(locale, "library.title")}</h1><p>{t(locale, "library.description")}</p></header>
    <div className="library-actions">
      <form className="library-new" onSubmit={(event) => { event.preventDefault(); void create(); }}><label><span>{t(locale, "library.new.label")}</span><input onChange={(event) => setTitle(event.target.value)} placeholder={t(locale, "library.new.placeholder")} value={title} /></label><button disabled={!title.trim() || status === "working"} type="submit">{t(locale, "library.new.action")}</button></form>
      <button className="library-import" disabled={status === "working"} onClick={() => void importStory()} type="button">{t(locale, "library.import")}</button>
    </div>
    <div className="library-views"><span>{t(locale, "library.view")}</span><button aria-pressed={view === "cover"} onClick={() => setView("cover")} type="button">{t(locale, "library.cover")}</button><button aria-pressed={view === "shelf"} onClick={() => setView("shelf")} type="button">{t(locale, "library.shelf")}</button></div>
    {status === "error" && <p className="proof-error" role="alert">{t(locale, "library.error")}</p>}
    {notice && <p className={notice.kind === "imported" || notice.kind === "exported" ? "library-notice" : "proof-error"} role={notice.kind === "imported" || notice.kind === "exported" ? "status" : "alert"}>{t(locale, noticeKeys[notice.kind], { title: notice.title ?? "" })}</p>}
    {stories.length === 0 ? <p className="performance-instructions">{t(locale, "library.empty")}</p> : <div className={`library-stories is-${view}`}>{stories.map((story) => <article className="library-story" key={story.id}><div className="library-book"><span>{story.title}</span></div><div><h2>{story.title}</h2><p>{t(locale, "library.opened", { date: formattedDate(story.lastOpenedAt, locale) })}</p><div className="library-story-actions"><button disabled={status === "working"} onClick={() => void open(story.id)} type="button">{t(locale, "library.open")}</button><button aria-label={t(locale, "library.exportLabel", { title: story.title })} disabled={status === "working"} onClick={() => void exportStory(story)} type="button">{t(locale, "library.export")}</button></div></div></article>)}</div>}
  </section>;
}
