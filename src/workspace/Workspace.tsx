import { getCurrentWindow } from "@tauri-apps/api/window";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { type Locale, t } from "../i18n";
import { storyApi, type StoryDocument, type StoryWorkspace } from "../services/storyApi";
import { MarkdownEditor } from "./MarkdownEditor";

type Layout = { left: { tabs: string[]; activeTabId: string | null }; right: { tabs: string[]; activeTabId: string | null }; sizes: [number, number, number]; collapsed: [boolean, boolean, boolean] };
const fallbackLayout: Layout = { left: { tabs: ["journal"], activeTabId: "journal" }, right: { tabs: [], activeTabId: null }, sizes: [45, 35, 20], collapsed: [false, false, false] };

export function Workspace({ storyId, locale, onExit }: { storyId: string; locale: Locale; onExit: () => void }) {
  const [data, setData] = useState<StoryWorkspace>(); const [layout, setLayout] = useState<Layout>(fallbackLayout);
  const [dirty, setDirty] = useState<Record<string, string>>({}); const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle"); const [findOpen, setFindOpen] = useState(false); const [query, setQuery] = useState(""); const [leaving, setLeaving] = useState(false);
  const saveTimer = useRef<number | undefined>(undefined); const savedTimer = useRef<number | undefined>(undefined);
  const dirtyRef = useRef<Record<string, string>>({}); const pendingLayoutRef = useRef<string | null>(null); const saveInFlight = useRef<Promise<void> | null>(null); const closing = useRef(false);
  const workspaceRoot = useRef<HTMLElement>(null);
  useEffect(() => { void storyApi.loadWorkspace(storyId).then((next) => { setData(next); try { setLayout(JSON.parse(next.workspaceLayoutJson)); } catch { setLayout(fallbackLayout); } }); }, [storyId]);
  const flush = useCallback(async (explicit = false): Promise<boolean> => {
    window.clearTimeout(saveTimer.current);
    if (explicit) { window.clearTimeout(savedTimer.current); setSaveState("saving"); }
    try {
      while (saveInFlight.current || Object.keys(dirtyRef.current).length || pendingLayoutRef.current !== null) {
        const operation = saveInFlight.current ?? (async () => {
          for (const [documentId, markdown] of Object.entries(dirtyRef.current)) {
            await storyApi.saveMarkdown(storyId, documentId, markdown);
            setData((current) => current && { ...current, documents: current.documents.map((document) => document.id === documentId ? { ...document, markdown } : document) });
            if (dirtyRef.current[documentId] === markdown) {
              const remaining = { ...dirtyRef.current }; delete remaining[documentId]; dirtyRef.current = remaining; setDirty(remaining);
            }
          }
          const workspaceLayoutJson = pendingLayoutRef.current;
          if (workspaceLayoutJson !== null) {
            await storyApi.saveLayout(storyId, workspaceLayoutJson);
            if (pendingLayoutRef.current === workspaceLayoutJson) pendingLayoutRef.current = null;
          }
        })();
        saveInFlight.current = operation;
        try { await operation; } finally { if (saveInFlight.current === operation) saveInFlight.current = null; }
      }
      if (explicit) {
        setSaveState("saved");
        savedTimer.current = window.setTimeout(() => setSaveState((current) => current === "saved" ? "idle" : current), 1300);
      } else setSaveState((current) => current === "error" ? "idle" : current);
      return true;
    } catch { setSaveState("error"); return false; }
  }, [storyId]);
  const scheduleSave = useCallback((delay: number) => { window.clearTimeout(saveTimer.current); saveTimer.current = window.setTimeout(() => { void flush(); }, delay); }, [flush]);
  const persistLayout = (next: Layout) => { pendingLayoutRef.current = JSON.stringify(next); scheduleSave(350); };
  const changeLayout = (next: Layout) => { setLayout(next); persistLayout(next); };
  const changeMarkdown = (id: string, markdown: string) => { const next = { ...dirtyRef.current, [id]: markdown }; dirtyRef.current = next; setDirty(next); scheduleSave(750); };
  const leave = async () => { if (leaving) return; setLeaving(true); if (await flush()) onExit(); else setLeaving(false); };
  useEffect(() => {
    const currentWindow = getCurrentWindow(); let unlisten: (() => void) | undefined; let disposed = false;
    void currentWindow.onCloseRequested(async (event) => {
      event.preventDefault();
      if (closing.current) return;
      closing.current = true;
      if (await flush()) {
        try { await currentWindow.destroy(); } catch { setSaveState("error"); closing.current = false; }
      } else closing.current = false;
    }).then((stop) => { if (disposed) stop(); else unlisten = stop; }).catch(() => setSaveState("error"));
    return () => { disposed = true; unlisten?.(); window.clearTimeout(saveTimer.current); window.clearTimeout(savedTimer.current); };
  }, [flush]);
  useEffect(() => { const key = (event: KeyboardEvent) => { if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") { event.preventDefault(); void flush(true); } if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "f") { event.preventDefault(); setFindOpen(true); } if (event.key === "Escape") setFindOpen(false); }; window.addEventListener("keydown", key); return () => window.removeEventListener("keydown", key); }, [flush]);
  const documents = useMemo(() => new Map(data?.documents.map((document) => [document.id, document])), [data]);
  const move = (id: string, target: "left" | "right") => { const other = target === "left" ? "right" : "left"; const next = structuredClone(layout); next.left.tabs = next.left.tabs.filter((tab) => tab !== id); next.right.tabs = next.right.tabs.filter((tab) => tab !== id); next[target].tabs.push(id); next[target].activeTabId = id; if (next[other].activeTabId === id) next[other].activeTabId = next[other].tabs[0] ?? null; changeLayout(next); };
  const resize = (boundary: 0 | 1, event: React.PointerEvent<HTMLButtonElement>) => {
    if (layout.collapsed[boundary] || layout.collapsed[boundary + 1] || !workspaceRoot.current) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    const startX = event.clientX; const startSizes = layout.sizes; const width = workspaceRoot.current.getBoundingClientRect().width;
    let newest = layout;
    const movePointer = (nextEvent: PointerEvent) => {
      const delta = (nextEvent.clientX - startX) / width * 100;
      const next = structuredClone(layout); const combined = startSizes[boundary] + startSizes[boundary + 1];
      next.sizes[boundary] = Math.max(15, Math.min(combined - 15, startSizes[boundary] + delta)); next.sizes[boundary + 1] = combined - next.sizes[boundary]; newest = next; setLayout(next);
    };
    const endPointer = () => { window.removeEventListener("pointermove", movePointer); window.removeEventListener("pointerup", endPointer); persistLayout(newest); };
    window.addEventListener("pointermove", movePointer); window.addEventListener("pointerup", endPointer);
  };
  const createDocument = async () => { const title = window.prompt(t(locale, "workspace.newDocumentPrompt")); if (!title?.trim()) return; try { const document = await storyApi.createMarkdown(storyId, title); setData((current) => current && { ...current, documents: [...current.documents, document] }); const next = structuredClone(layout); next.left.tabs.push(document.id); next.left.activeTabId = document.id; changeLayout(next); } catch { setSaveState("error"); } };
  if (!data) return <main className="workspace-loading" />;
  return <main className="workspace" ref={workspaceRoot} style={{ gridTemplateColumns: `${layout.collapsed[0] ? "42px" : `${layout.sizes[0]}fr`} 6px ${layout.collapsed[1] ? "42px" : `${layout.sizes[1]}fr`} 6px ${layout.collapsed[2] ? "42px" : `${layout.sizes[2]}fr`}` }}>
    <header className="workspace-bar"><button disabled={leaving} onClick={() => void leave()} type="button">← {t(locale, "workspace.back")}</button><h1>{data.story.title}</h1><div className={`workspace-save is-${saveState}`} aria-live="polite">{saveState === "saving" ? t(locale, "workspace.saving") : saveState === "saved" ? t(locale, "workspace.saved") : saveState === "error" ? t(locale, "workspace.saveError") : ""}</div><button onClick={() => void createDocument()} type="button">{t(locale, "workspace.newDocument")}</button><button onClick={() => void flush(true)} type="button">{t(locale, "workspace.save")}</button></header>
    <DocumentPanel side="left" locale={locale} layout={layout} documents={documents} dirty={dirty} findOpen={findOpen} query={query} setQuery={setQuery} onChange={changeMarkdown} onActivate={(id) => changeLayout({ ...layout, left: { ...layout.left, activeTabId: id } })} onMove={move} onToggle={() => { const next = structuredClone(layout); next.collapsed[0] = !next.collapsed[0]; changeLayout(next); }} />
    <button aria-label={t(locale, "workspace.resize")} className="workspace-splitter" onPointerDown={(event) => resize(0, event)} type="button" />
    <DocumentPanel side="right" locale={locale} layout={layout} documents={documents} dirty={dirty} findOpen={findOpen} query={query} setQuery={setQuery} onChange={changeMarkdown} onActivate={(id) => changeLayout({ ...layout, right: { ...layout.right, activeTabId: id } })} onMove={move} onToggle={() => { const next = structuredClone(layout); next.collapsed[1] = !next.collapsed[1]; changeLayout(next); }} />
    <button aria-label={t(locale, "workspace.resize")} className="workspace-splitter" onPointerDown={(event) => resize(1, event)} type="button" />
    <aside className="tools-panel"><button aria-label={layout.collapsed[2] ? t(locale, "workspace.expand") : t(locale, "workspace.collapse")} className="panel-collapse" onClick={() => { const next=structuredClone(layout); next.collapsed[2]=!next.collapsed[2]; changeLayout(next); }} type="button">{layout.collapsed[2] ? "›" : "‹"}</button>{!layout.collapsed[2] && <><h2>{t(locale, "workspace.tools")}</h2><p>{t(locale, "workspace.empty")}</p></>}</aside>
  </main>;
}

function DocumentPanel({ side, locale, layout, documents, dirty, findOpen, query, setQuery, onChange, onActivate, onMove, onToggle }: { side:"left"|"right"; locale:Locale; layout:Layout; documents:Map<string, StoryDocument>; dirty:Record<string,string>; findOpen:boolean; query:string; setQuery:(value:string)=>void; onChange:(id:string,value:string)=>void; onActivate:(id:string)=>void; onMove:(id:string,target:"left"|"right")=>void; onToggle:()=>void }) {
  const panel = layout[side]; const collapsed = layout.collapsed[side === "left" ? 0 : 1]; const active = panel.activeTabId ? documents.get(panel.activeTabId) : undefined; const markdown = active?.id ? dirty[active.id] ?? active.markdown ?? "" : ""; const matches = query ? markdown.match(new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi"))?.length ?? 0 : 0;
  return <section className="document-panel"> <button aria-label={collapsed ? t(locale, "workspace.expand") : t(locale, "workspace.collapse")} className="panel-collapse" onClick={onToggle} type="button">{collapsed ? "›" : "‹"}</button>{!collapsed && <><nav className="document-tabs" aria-label="Documents">{panel.tabs.map((id) => { const doc=documents.get(id); return doc && <button draggable key={id} onClick={() => onActivate(id)} onDragStart={(event) => event.dataTransfer.setData("text/plain", id)} onDoubleClick={() => onMove(id, side === "left" ? "right" : "left")} aria-pressed={id === panel.activeTabId} type="button">{doc.title}</button>; })}</nav>{findOpen && active?.documentType === "markdown" && <label className="workspace-find"><span>{t(locale, "workspace.find")}</span><input autoFocus onChange={(event) => setQuery(event.target.value)} placeholder={t(locale, "workspace.findPlaceholder")} value={query}/><em>{query ? matches ? t(locale, "workspace.matches", { count: matches }) : t(locale, "workspace.noMatches") : ""}</em></label>}<div className="document-body" onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); const id=event.dataTransfer.getData("text/plain"); if (id) onMove(id, side); }}>{active?.documentType === "markdown" ? <MarkdownEditor key={active.id} markdown={markdown} onChange={(value) => onChange(active.id, value)} /> : <p>{t(locale, "workspace.empty")}</p>}</div></>}</section>;
}
