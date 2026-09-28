import { invoke } from "@tauri-apps/api/core";
import { useRef, useState } from "react";
import { GlobalWorkerOptions, getDocument, PDFDataRangeTransport } from "pdfjs-dist/legacy/build/pdf.mjs";
import pdfWorkerUrl from "pdfjs-dist/legacy/build/pdf.worker.min.mjs?url";
import { type Locale, t } from "../i18n";

type PdfProofMetadata = {
  byteLength: number;
  initialBytes: number[];
  rangeRequests: number;
  servedBytes: number;
};

function megabytes(bytes: number) {
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

export function PdfRangeProof({ locale }: { locale: Locale }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [metadata, setMetadata] = useState<PdfProofMetadata>();
  const [loadMilliseconds, setLoadMilliseconds] = useState<number>();
  const [pageText, setPageText] = useState("");
  const [query, setQuery] = useState("FigmentFell");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>();

  const run = async () => {
    setIsLoading(true);
    setError(undefined);
    setMetadata(undefined);
    setPageText("");
    const startedAt = performance.now();
    try {
      const source = await invoke<PdfProofMetadata>("start_pdf_proof");
      GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
      const transport = new PDFDataRangeTransport(source.byteLength, new Uint8Array(source.initialBytes), false);
      transport.requestDataRange = (begin, end) => {
        void invoke<number[]>("read_pdf_proof_range", { begin, end })
          .then((bytes) => transport.onDataRange(begin, new Uint8Array(bytes)))
          .catch((rangeError) => console.error("FigmentFell PDF range request failed", rangeError));
      };
      const loadingTask = getDocument({
        range: transport,
        disableAutoFetch: true,
        disableStream: true,
        rangeChunkSize: 64 * 1024,
      });
      const document = await loadingTask.promise;
      const page = await document.getPage(1);
      const viewport = page.getViewport({ scale: 1.1 });
      const context = canvas.current?.getContext("2d");
      if (!canvas.current || !context) throw new Error("Canvas is unavailable.");
      canvas.current.width = Math.ceil(viewport.width);
      canvas.current.height = Math.ceil(viewport.height);
      await page.render({ canvasContext: context, viewport }).promise;
      const textContent = await page.getTextContent();
      setPageText(textContent.items.map((item) => ("str" in item ? item.str : "")).join(" "));
      setLoadMilliseconds(performance.now() - startedAt);
      setMetadata(await invoke<PdfProofMetadata>("pdf_proof_metrics"));
      await document.destroy();
    } catch (proofError) {
      console.error("FigmentFell PDF proof failed", proofError);
      setError(proofError instanceof Error ? proofError.message : String(proofError));
    } finally {
      setIsLoading(false);
    }
  };

  const matchCount = query && pageText ? pageText.split(query).length - 1 : 0;

  return (
    <section className="performance-proof" aria-label={t(locale, "pdfproof.title")}>
      <header className="performance-header">
        <p className="proof-eyebrow">{t(locale, "pdfproof.eyebrow")}</p>
        <h1>{t(locale, "pdfproof.title")}</h1>
        <p>{t(locale, "pdfproof.description")}</p>
      </header>

      <button className="pdf-proof-run" disabled={isLoading} onClick={() => void run()} type="button">
        {isLoading ? t(locale, "pdfproof.running") : t(locale, "pdfproof.run")}
      </button>
      {error && <p className="proof-error">{t(locale, "pdfproof.error", { detail: error })}</p>}
      <canvas className="pdf-proof-canvas" ref={canvas} />

      {metadata && (
        <>
          <section className="performance-metrics" aria-label={t(locale, "pdfproof.metrics")}>
            <div><span>{t(locale, "pdfproof.size")}</span><strong>{megabytes(metadata.byteLength)}</strong></div>
            <div><span>{t(locale, "pdfproof.served")}</span><strong>{megabytes(metadata.servedBytes)}</strong></div>
            <div><span>{t(locale, "pdfproof.requests")}</span><strong>{metadata.rangeRequests}</strong></div>
            <div><span>{t(locale, "pdfproof.ready")}</span><strong>{loadMilliseconds?.toFixed(0)} ms</strong></div>
          </section>
          <p className="performance-instructions">{metadata.servedBytes < metadata.byteLength ? t(locale, "pdfproof.partial") : t(locale, "pdfproof.full")}</p>
          <label className="performance-search">
            <span>{t(locale, "pdfproof.search")}</span>
            <input onChange={(event) => setQuery(event.target.value)} type="search" value={query} />
            <strong>{t(locale, "pdfproof.matches", { count: matchCount })}</strong>
          </label>
        </>
      )}
    </section>
  );
}
