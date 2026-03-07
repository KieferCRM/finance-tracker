"use client";

import { FormEvent, useState } from "react";

type ImportResponse = {
  ok: boolean;
  format: "combined_export" | "income_sheet" | "expense_sheet" | "serverlife_shift";
  imported_income: number;
  imported_expense: number;
  skipped_rows: number;
  invalid_rows: number;
};

export default function ImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<ImportResponse | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setResult(null);

    if (!file) {
      setError("Choose a CSV file first.");
      return;
    }

    setImporting(true);

    try {
      const csv = await file.text();
      const res = await fetch("/api/import/csv", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ csv }),
      });

      if (!res.ok) {
        const json = (await res.json().catch(() => ({}))) as { error?: string };
        setError(json.error ?? "Import failed.");
        setImporting(false);
        return;
      }

      const json = (await res.json()) as ImportResponse;
      setResult(json);
    } catch {
      setError("Import failed.");
    } finally {
      setImporting(false);
    }
  }

  return (
    <main style={{ display: "grid", gap: 14 }}>
      <section style={{ border: "1px solid var(--line)", borderRadius: 12, background: "var(--surface)", padding: 14 }}>
        <h1 style={{ margin: "0 0 6px" }}>Import CSV</h1>
        <p style={{ margin: 0, color: "var(--muted)" }}>
          Upload CSV from ServerLife, Google Sheets, or TipTapped export. Imported rows are added directly into your calendar + ledger.
        </p>
      </section>

      <section style={{ border: "1px solid var(--line)", borderRadius: 12, background: "var(--surface)", padding: 14, display: "grid", gap: 10 }}>
        <form onSubmit={onSubmit} style={{ display: "grid", gap: 10 }}>
          <input
            type="file"
            accept=".csv,text/csv"
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            style={{ padding: 10, borderRadius: 8, border: "1px solid var(--line)", background: "var(--surface-2)", color: "var(--text)" }}
          />
          <div>
            <button
              type="submit"
              disabled={importing}
              style={{ border: "none", borderRadius: 8, padding: "10px 14px", background: "var(--neon)", color: "#111", fontWeight: 800 }}
            >
              {importing ? "Importing..." : "Import CSV"}
            </button>
          </div>
        </form>

        {error ? <div style={{ color: "var(--danger)" }}>{error}</div> : null}

        {result ? (
          <article style={{ border: "1px solid var(--line)", borderRadius: 10, background: "var(--surface-2)", padding: 10, display: "grid", gap: 4 }}>
            <strong>Import Complete</strong>
            <div style={{ color: "var(--muted)", fontSize: 13 }}>Format: {result.format}</div>
            <div style={{ color: "var(--muted)", fontSize: 13 }}>Income imported: {result.imported_income}</div>
            <div style={{ color: "var(--muted)", fontSize: 13 }}>Expenses imported: {result.imported_expense}</div>
            <div style={{ color: "var(--muted)", fontSize: 13 }}>Skipped rows: {result.skipped_rows}</div>
            <div style={{ color: "var(--muted)", fontSize: 13 }}>Invalid rows: {result.invalid_rows}</div>
          </article>
        ) : null}
      </section>

      <section style={{ border: "1px solid var(--line)", borderRadius: 12, background: "var(--surface)", padding: 14 }}>
        <h2 style={{ marginTop: 0 }}>Supported CSV Formats</h2>
        <ul style={{ margin: 0, paddingLeft: 18, display: "grid", gap: 8, color: "var(--muted)" }}>
          <li>ServerLife export with date/take-home/hours columns</li>
          <li>TipTapped monthly export (`type,date,...`)</li>
          <li>Google Sheets `income_entries` tab export</li>
          <li>Google Sheets `expense_entries` tab export</li>
        </ul>
      </section>
    </main>
  );
}
