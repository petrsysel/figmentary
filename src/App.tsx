import { invoke } from "@tauri-apps/api/core";
import { useEffect, useMemo, useState } from "react";
import { type Locale, t } from "./i18n";
import { MilkdownChunkEditor } from "./proofs/MilkdownChunkEditor";
import { buildSyntheticJournal, searchJournal } from "./proofs/syntheticJournal";
import "./App.css";

type RuntimeInfo = {
  operatingSystem: string;
  architecture: string;
};

const locale: Locale = "cs-CZ";
const windowRadius = 1;

function App() {
  const journal = useMemo(() => buildSyntheticJournal(), []);
  const [activeIndex, setActiveIndex] = useState(journal.length - 1);
  const [runtimeInfo, setRuntimeInfo] = useState<RuntimeInfo>();
  const [query, setQuery] = useState("");
  const [editedChunks, setEditedChunks] = useState<Record<string, string>>({});

  useEffect(() => {
    void invoke<RuntimeInfo>("proof_runtime_info").then(setRuntimeInfo).catch(() => undefined);
  }, []);

  const start = Math.max(0, activeIndex - windowRadius);
  const end = Math.min(journal.length, activeIndex + windowRadius + 1);
  const mountedChunks = journal.slice(start, end);
  const chunks = useMemo(() => journal.map((chunk) => ({ ...chunk, markdown: editedChunks[chunk.id] ?? chunk.markdown })), [editedChunks, journal]);
  const activeChunk = chunks[activeIndex];
  const totalBlocks = journal.reduce((sum, chunk) => sum + chunk.blockCount, 0);
  const results = useMemo(() => searchJournal(chunks, query), [chunks, query]);

  return (
    <main className="proof-shell">
      <header className="proof-header">
        <p className="proof-eyebrow">{t(locale, "proof.eyebrow")}</p>
        <h1>{t(locale, "proof.title")}</h1>
        <p className="proof-description">{t(locale, "proof.description")}</p>
      </header>

      <section className="proof-summary" aria-label={t(locale, "proof.journal")}>
        <div><span>{t(locale, "proof.journal")}</span><strong>{journal.length.toLocaleString("cs-CZ")} {t(locale, "proof.chunks")}</strong></div>
        <div><span>{t(locale, "proof.blocks")}</span><strong>{totalBlocks.toLocaleString("cs-CZ")}</strong></div>
        <div><span>{t(locale, "proof.runtime")}</span><strong>{runtimeInfo ? t(locale, "proof.runtime.ready", { os: runtimeInfo.operatingSystem, architecture: runtimeInfo.architecture }) : t(locale, "proof.runtime.pending")}</strong></div>
      </section>

      <section className="proof-workspace" aria-label={t(locale, "proof.editor")}>
        <aside className="proof-window">
          <span className="proof-label">{t(locale, "proof.window")}</span>
          <div className="proof-chunk-list">
            {mountedChunks.map((chunk, index) => (
              <button className={start + index === activeIndex ? "proof-chunk is-active" : "proof-chunk"} key={chunk.id} onClick={() => setActiveIndex(start + index)} type="button">
                {chunk.id}
              </button>
            ))}
          </div>
          <div className="proof-controls">
            <button disabled={activeIndex === 0} onClick={() => setActiveIndex((index) => Math.max(0, index - 1))} type="button">{t(locale, "proof.previous")}</button>
            <button disabled={activeIndex === journal.length - 1} onClick={() => setActiveIndex((index) => Math.min(journal.length - 1, index + 1))} type="button">{t(locale, "proof.next")}</button>
          </div>
          <label className="proof-search">
            <span>{t(locale, "proof.search")}</span>
            <input onChange={(event) => setQuery(event.target.value)} placeholder={t(locale, "proof.search.placeholder")} type="search" value={query} />
          </label>
          <p className="proof-result-summary">{t(locale, "proof.search.summary", { chunks: results.length, matches: results.reduce((sum, result) => sum + result.matches, 0) })}</p>
          {results.length > 0 && (
            <div className="proof-results">
              {results.slice(0, 6).map((result) => (
                <button key={result.chunkId} onClick={() => setActiveIndex(result.chunkIndex)} type="button">
                  {result.chunkId} · {result.matches}×
                </button>
              ))}
            </div>
          )}
        </aside>

        <article className="proof-document">
          <span className="proof-label">{t(locale, "proof.editor")}</span>
          <MilkdownChunkEditor
            key={activeChunk.id}
            markdown={activeChunk.markdown}
            onMarkdownChange={(markdown) => setEditedChunks((current) => ({ ...current, [activeChunk.id]: markdown }))}
          />
        </article>
      </section>

      <p className="proof-notice">{t(locale, "proof.notice")}</p>
    </main>
  );
}

export default App;
