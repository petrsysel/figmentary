import { invoke } from "@tauri-apps/api/core";
import { useCallback, useEffect, useMemo, useState } from "react";
import { type Locale, t } from "./i18n";
import { MilkdownChunkEditor } from "./proofs/MilkdownChunkEditor";
import { PerformanceProof } from "./proofs/PerformanceProof";
import { buildSyntheticJournal, searchJournal } from "./proofs/syntheticJournal";
import "./App.css";

type RuntimeInfo = {
  operatingSystem: string;
  architecture: string;
};

type StorageProofResult = {
  chunkCount: number;
  attachmentMegabytes: number;
  attachmentBytesBefore: number;
  attachmentBytesAfter: number;
  elapsedMilliseconds: number;
};

type EditorMode = "windowed" | "shared";
type ProofView = "architecture" | "performance";

const locale: Locale = "cs-CZ";
const windowRadius = 1;

function App() {
  const journal = useMemo(() => buildSyntheticJournal(), []);
  const [activeIndex, setActiveIndex] = useState(journal.length - 1);
  const [runtimeInfo, setRuntimeInfo] = useState<RuntimeInfo>();
  const [storageProof, setStorageProof] = useState<StorageProofResult>();
  const [storageProofError, setStorageProofError] = useState(false);
  const [isStorageProofRunning, setIsStorageProofRunning] = useState(false);
  const [query, setQuery] = useState("");
  const [editedChunks, setEditedChunks] = useState<Record<string, string>>({});
  const [editorInstanceCount, setEditorInstanceCount] = useState(0);
  const [editorMode, setEditorMode] = useState<EditorMode>("windowed");
  const [sharedMarkdown, setSharedMarkdown] = useState("");
  const [proofView, setProofView] = useState<ProofView>("architecture");

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
  const markEditorCreated = useCallback(() => setEditorInstanceCount((count) => count + 1), []);
  const openSharedEditor = () => {
    setSharedMarkdown(chunks.map((chunk) => chunk.markdown).join("\n\n"));
    setEditorMode("shared");
  };
  const editorMarkdown = editorMode === "shared" ? sharedMarkdown : activeChunk.markdown;

  const runStorageProof = () => {
    setIsStorageProofRunning(true);
    setStorageProofError(false);
    void invoke<StorageProofResult>("run_storage_proof")
      .then(setStorageProof)
      .catch((error) => {
        console.error("FigmentFell storage proof failed", error);
        setStorageProofError(true);
      })
      .finally(() => setIsStorageProofRunning(false));
  };

  return (
    <main className="proof-shell">
      <header className="proof-header">
        <p className="proof-eyebrow">{t(locale, "proof.eyebrow")}</p>
        <h1>{t(locale, "proof.title")}</h1>
        <p className="proof-description">{t(locale, "proof.description")}</p>
        <div className="proof-view-tabs" role="tablist" aria-label={t(locale, "proof.views")}>
          <button aria-selected={proofView === "architecture"} onClick={() => setProofView("architecture")} role="tab" type="button">{t(locale, "proof.view.architecture")}</button>
          <button aria-selected={proofView === "performance"} onClick={() => setProofView("performance")} role="tab" type="button">{t(locale, "proof.view.performance")}</button>
        </div>
      </header>

      {proofView === "performance" ? <PerformanceProof locale={locale} /> : <>
      <section className="proof-summary" aria-label={t(locale, "proof.journal")}>
        <div><span>{t(locale, "proof.journal")}</span><strong>{journal.length.toLocaleString("cs-CZ")} {t(locale, "proof.chunks")}</strong></div>
        <div><span>{t(locale, "proof.blocks")}</span><strong>{totalBlocks.toLocaleString("cs-CZ")}</strong></div>
        <div><span>{t(locale, "proof.runtime")}</span><strong>{runtimeInfo ? t(locale, "proof.runtime.ready", { os: runtimeInfo.operatingSystem, architecture: runtimeInfo.architecture }) : t(locale, "proof.runtime.pending")}</strong></div>
      </section>

      <section className="proof-decision" aria-label={t(locale, "proof.decision.title")}>
        <div>
          <p className="proof-label">{t(locale, "proof.decision.eyebrow")}</p>
          <h2>{t(locale, "proof.decision.title")}</h2>
          <ol>
            {editorMode === "shared" ? (
              <>
                <li>{t(locale, "proof.decision.shared.edit")}</li>
                <li>{t(locale, "proof.decision.shared.undo")}</li>
              </>
            ) : (
              <>
                <li>{t(locale, "proof.decision.step.edit")}</li>
                <li>{t(locale, "proof.decision.step.switch")}</li>
                <li>{t(locale, "proof.decision.step.undo")}</li>
              </>
            )}
          </ol>
        </div>
        <div className="proof-decision-metrics">
          <p className="proof-decision-metric">{t(locale, "proof.decision.instances", { count: editorInstanceCount })}</p>
          <p className="proof-decision-metric">{editorMode === "shared" ? t(locale, "proof.decision.allMounted", { count: journal.length }) : t(locale, "proof.decision.windowMounted", { count: mountedChunks.length })}</p>
        </div>
      </section>

      <section className="proof-storage" aria-label={t(locale, "proof.storage.title")}>
        <div>
          <p className="proof-label">{t(locale, "proof.storage.eyebrow")}</p>
          <h2>{t(locale, "proof.storage.title")}</h2>
          <p>{t(locale, "proof.storage.description")}</p>
        </div>
        <div className="proof-storage-action">
          <button disabled={isStorageProofRunning} onClick={runStorageProof} type="button">
            {isStorageProofRunning ? t(locale, "proof.storage.running") : t(locale, "proof.storage.run")}
          </button>
          {storageProof && <p>{t(locale, "proof.storage.success", { chunks: storageProof.chunkCount, megabytes: storageProof.attachmentMegabytes, milliseconds: storageProof.elapsedMilliseconds })}</p>}
          {storageProofError && <p className="proof-error">{t(locale, "proof.storage.error")}</p>}
        </div>
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
          <div className="proof-mode-controls">
            <button disabled={editorMode === "windowed"} onClick={() => setEditorMode("windowed")} type="button">{t(locale, "proof.mode.windowed")}</button>
            <button disabled={editorMode === "shared"} onClick={openSharedEditor} type="button">{t(locale, "proof.mode.shared")}</button>
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
          <span className="proof-label">{editorMode === "shared" ? t(locale, "proof.editor.shared") : t(locale, "proof.editor")}</span>
          <MilkdownChunkEditor
            key={editorMode === "shared" ? "shared-document" : activeChunk.id}
            markdown={editorMarkdown}
            onEditorCreated={markEditorCreated}
            onMarkdownChange={(markdown) => {
              if (editorMode === "shared") {
                setSharedMarkdown(markdown);
                return;
              }
              setEditedChunks((current) => ({ ...current, [activeChunk.id]: markdown }));
            }}
          />
        </article>
      </section>

      <p className="proof-notice">{t(locale, "proof.notice")}</p>
      </>}
    </main>
  );
}

export default App;
