import { useCallback, useEffect, useRef, useState } from "react";
import { type Locale, t } from "../i18n";
import {
  PerformanceMilkdownEditor,
  type PerformanceEditorControls,
  type PerformanceEditorMetrics,
} from "./PerformanceMilkdownEditor";
import type { GeneratedJournal } from "./performanceJournal";
import PerformanceJournalWorker from "./performanceJournal.worker?worker";

type TestSize = 50_000 | 100_000 | 250_000 | 500_000 | 1_000_000;
type Assessment = "smooth" | "noticeable" | "unacceptable";
type ResultRow = {
  size: TestSize;
  generationMilliseconds: number;
  metrics: PerformanceEditorMetrics;
  inputMilliseconds?: number;
  scrollMilliseconds?: number;
  searchMilliseconds?: number;
  assessment: Assessment;
};

const sizes: TestSize[] = [50_000, 100_000, 250_000, 500_000, 1_000_000];

function formatNumber(value: number) {
  return value.toLocaleString("cs-CZ");
}

function formatMegabytes(bytes?: number) {
  return bytes === undefined ? "—" : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function PerformanceProof({ locale }: { locale: Locale }) {
  const [document, setDocument] = useState<GeneratedJournal>();
  const [activeSize, setActiveSize] = useState<TestSize>();
  const [generationMilliseconds, setGenerationMilliseconds] = useState<number>();
  const [isGenerating, setIsGenerating] = useState(false);
  const [metrics, setMetrics] = useState<PerformanceEditorMetrics>();
  const [controls, setControls] = useState<PerformanceEditorControls>();
  const [inputMilliseconds, setInputMilliseconds] = useState<number>();
  const [scrollMilliseconds, setScrollMilliseconds] = useState<number>();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchMatches, setSearchMatches] = useState(0);
  const [searchMilliseconds, setSearchMilliseconds] = useState<number>();
  const [assessment, setAssessment] = useState<Assessment>("smooth");
  const [results, setResults] = useState<ResultRow[]>([]);
  const workerRef = useRef<Worker | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => () => workerRef.current?.terminate(), []);
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "f" && document) {
        event.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [document]);

  const generate = (size: TestSize) => {
    setIsGenerating(true);
    setMetrics(undefined);
    setControls(undefined);
    setInputMilliseconds(undefined);
    setScrollMilliseconds(undefined);
    setSearchQuery("");
    setSearchMatches(0);
    setSearchMilliseconds(undefined);
    const startedAt = performance.now();
    workerRef.current?.terminate();
    const worker = new PerformanceJournalWorker();
    workerRef.current = worker;
    worker.onmessage = (event: MessageEvent<GeneratedJournal>) => {
      setGenerationMilliseconds(performance.now() - startedAt);
      setDocument(event.data);
      setActiveSize(size);
      setIsGenerating(false);
      worker.terminate();
    };
    worker.postMessage(size);
  };

  const recordResult = useCallback(() => {
    if (!activeSize || !metrics || generationMilliseconds === undefined) return;
    const next = { size: activeSize, generationMilliseconds, metrics, inputMilliseconds, scrollMilliseconds, searchMilliseconds, assessment };
    setResults((current) => [...current.filter((row) => row.size !== activeSize), next].sort((a, b) => a.size - b.size));
  }, [activeSize, assessment, generationMilliseconds, inputMilliseconds, metrics, scrollMilliseconds, searchMilliseconds]);

  const search = (query: string) => {
    setSearchQuery(query);
    if (!document || !query) {
      setSearchMatches(0);
      setSearchMilliseconds(undefined);
      return;
    }
    const startedAt = performance.now();
    let from = 0;
    let matches = 0;
    while (true) {
      const found = document.markdown.indexOf(query, from);
      if (found === -1) break;
      matches += 1;
      from = found + query.length;
    }
    setSearchMatches(matches);
    setSearchMilliseconds(performance.now() - startedAt);
  };

  const canRunMillion = results.some((result) => result.size === 500_000);

  return (
    <section className="performance-proof" aria-label={t(locale, "performance.title")}>
      <header className="performance-header">
        <p className="proof-eyebrow">{t(locale, "performance.eyebrow")}</p>
        <h1>{t(locale, "performance.title")}</h1>
        <p>{t(locale, "performance.description")}</p>
      </header>

      <div className="performance-size-actions" role="group" aria-label={t(locale, "performance.sizes")}>
        {sizes.map((size) => (
          <button disabled={isGenerating || (size === 1_000_000 && !canRunMillion)} key={size} onClick={() => generate(size)} type="button">
            {formatNumber(size)} {t(locale, "performance.words")}
          </button>
        ))}
      </div>

      {isGenerating && <p className="performance-status">{t(locale, "performance.generating")}</p>}
      {document && activeSize && (
        <>
          <section className="performance-metrics" aria-label={t(locale, "performance.metrics")}>
            <div><span>{t(locale, "performance.generated")}</span><strong>{formatNumber(document.wordCount)} {t(locale, "performance.words")}</strong></div>
            <div><span>{t(locale, "performance.blocks")}</span><strong>{formatNumber(document.blockCount)}</strong></div>
            <div><span>{t(locale, "performance.generation")}</span><strong>{generationMilliseconds?.toFixed(0)} ms</strong></div>
            <div><span>{t(locale, "performance.ready")}</span><strong>{metrics ? `${metrics.readyMilliseconds.toFixed(0)} ms` : t(locale, "performance.pending")}</strong></div>
            <div><span>{t(locale, "performance.dom")}</span><strong>{metrics ? formatNumber(metrics.domElementCount) : "—"}</strong></div>
            <div><span>{t(locale, "performance.heap")}</span><strong>{metrics ? formatMegabytes(metrics.heapBytes) : "—"}</strong></div>
            <div><span>{t(locale, "performance.input")}</span><strong>{inputMilliseconds === undefined ? "—" : `${inputMilliseconds.toFixed(1)} ms`}</strong></div>
            <div><span>{t(locale, "performance.scroll")}</span><strong>{scrollMilliseconds === undefined ? "—" : `${scrollMilliseconds.toFixed(1)} ms`}</strong></div>
            <div><span>{t(locale, "performance.search")}</span><strong>{searchMilliseconds === undefined ? "—" : `${searchMilliseconds.toFixed(1)} ms`}</strong></div>
          </section>

          <section className="performance-tools" aria-label={t(locale, "performance.tools")}>
            <div className="performance-tool-group">
              <span>{t(locale, "performance.jump")}</span>
              <button onClick={() => controls?.jump("start")} type="button">{t(locale, "performance.jump.start")}</button>
              <button onClick={() => controls?.jump("middle")} type="button">{t(locale, "performance.jump.middle")}</button>
              <button onClick={() => controls?.jump("end")} type="button">{t(locale, "performance.jump.end")}</button>
            </div>
            <button onClick={() => controls?.selectLargeRange()} type="button">{t(locale, "performance.select")}</button>
            <button disabled={!metrics} onClick={recordResult} type="button">{t(locale, "performance.record")}</button>
          </section>

          <div className="performance-assessment" role="group" aria-label={t(locale, "performance.assessment")}>
            <span>{t(locale, "performance.assessment")}</span>
            {(["smooth", "noticeable", "unacceptable"] as const).map((value) => (
              <button aria-pressed={assessment === value} key={value} onClick={() => setAssessment(value)} type="button">{t(locale, `performance.assessment.${value}`)}</button>
            ))}
          </div>

          <label className="performance-search">
            <span>{t(locale, "performance.search.label")}</span>
            <input onChange={(event) => search(event.target.value)} placeholder={t(locale, "performance.search.placeholder")} ref={searchInputRef} type="search" value={searchQuery} />
            <strong>{t(locale, "performance.search.result", { matches: searchMatches, milliseconds: searchMilliseconds?.toFixed(1) ?? "—" })}</strong>
          </label>

          <p className="performance-instructions">{t(locale, "performance.instructions")}</p>
          <PerformanceMilkdownEditor
            key={activeSize}
            markdown={document.markdown}
            onInputLatency={setInputMilliseconds}
            onReady={(nextMetrics, nextControls) => { setMetrics(nextMetrics); setControls(nextControls); }}
            onScrollLatency={setScrollMilliseconds}
          />
        </>
      )}

      <section className="performance-results" aria-label={t(locale, "performance.results")}>
        <h2>{t(locale, "performance.results")}</h2>
        <table>
          <thead><tr><th>{t(locale, "performance.table.size")}</th><th>{t(locale, "performance.table.ready")}</th><th>{t(locale, "performance.table.dom")}</th><th>{t(locale, "performance.table.heap")}</th><th>{t(locale, "performance.table.input")}</th><th>{t(locale, "performance.table.scroll")}</th><th>{t(locale, "performance.table.search")}</th><th>{t(locale, "performance.table.assessment")}</th></tr></thead>
          <tbody>
            {results.length === 0 ? <tr><td colSpan={8}>{t(locale, "performance.table.empty")}</td></tr> : results.map((result) => (
              <tr key={result.size}><td>{formatNumber(result.size)}</td><td>{result.metrics.readyMilliseconds.toFixed(0)} ms</td><td>{formatNumber(result.metrics.domElementCount)}</td><td>{formatMegabytes(result.metrics.heapBytes)}</td><td>{result.inputMilliseconds?.toFixed(1) ?? "—"} ms</td><td>{result.scrollMilliseconds?.toFixed(1) ?? "—"} ms</td><td>{result.searchMilliseconds?.toFixed(1) ?? "—"} ms</td><td>{t(locale, `performance.assessment.${result.assessment}`)}</td></tr>
            ))}
          </tbody>
        </table>
      </section>
    </section>
  );
}
