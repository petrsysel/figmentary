import { invoke } from "@tauri-apps/api/core";
import { useState } from "react";
import { type Locale, t } from "../i18n";

type RecoveryProofResult = {
  attachmentMegabytes: number;
  snapshotBytes: number;
  snapshotRevision: string;
  currentRevision: string;
  recoveredRevision: string;
  rescueRevision: string;
  elapsedMilliseconds: number;
};

function megabytes(bytes: number) {
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

export function RecoveryProof({ locale }: { locale: Locale }) {
  const [result, setResult] = useState<RecoveryProofResult>();
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string>();

  const run = async () => {
    setIsRunning(true);
    setResult(undefined);
    setError(undefined);
    try {
      setResult(await invoke<RecoveryProofResult>("run_recovery_proof"));
    } catch (proofError) {
      setError(proofError instanceof Error ? proofError.message : String(proofError));
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <section className="performance-proof" aria-label={t(locale, "recoveryproof.title")}>
      <header className="performance-header">
        <p className="proof-eyebrow">{t(locale, "recoveryproof.eyebrow")}</p>
        <h1>{t(locale, "recoveryproof.title")}</h1>
        <p>{t(locale, "recoveryproof.description")}</p>
      </header>

      <button className="pdf-proof-run" disabled={isRunning} onClick={() => void run()} type="button">
        {isRunning ? t(locale, "recoveryproof.running") : t(locale, "recoveryproof.run")}
      </button>
      {error && <p className="proof-error">{t(locale, "recoveryproof.error", { detail: error })}</p>}

      {result && (
        <>
          <section className="performance-metrics" aria-label={t(locale, "recoveryproof.metrics")}>
            <div><span>{t(locale, "recoveryproof.attachment")}</span><strong>{result.attachmentMegabytes} MB</strong></div>
            <div><span>{t(locale, "recoveryproof.snapshot")}</span><strong>{megabytes(result.snapshotBytes)}</strong></div>
            <div><span>{t(locale, "recoveryproof.restore")}</span><strong>{t(locale, "recoveryproof.verified")}</strong></div>
            <div><span>{t(locale, "recoveryproof.ready")}</span><strong>{result.elapsedMilliseconds} ms</strong></div>
          </section>
          <section className="recovery-proof-revisions" aria-label={t(locale, "recoveryproof.revisions")}>
            <div><span>{t(locale, "recoveryproof.atSnapshot")}</span><code>{result.snapshotRevision}</code></div>
            <div><span>{t(locale, "recoveryproof.beforeRestore")}</span><code>{result.currentRevision}</code></div>
            <div><span>{t(locale, "recoveryproof.restored")}</span><code>{result.recoveredRevision}</code></div>
            <div><span>{t(locale, "recoveryproof.rescue")}</span><code>{result.rescueRevision}</code></div>
          </section>
          <p className="performance-instructions">{t(locale, "recoveryproof.success")}</p>
        </>
      )}
    </section>
  );
}
