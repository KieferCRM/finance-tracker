"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

const CURRENT_MONTH = new Date().toISOString().slice(0, 7);

export default function SettingsPage() {
  const [exportMonth, setExportMonth] = useState(CURRENT_MONTH);

  const exportHref = useMemo(() => `/api/export/monthly?month=${exportMonth}`, [exportMonth]);

  return (
    <main style={{ display: "grid", gap: 14 }}>
      <section style={{ border: "1px solid var(--line)", borderRadius: 12, background: "var(--surface)", padding: 14, display: "grid", gap: 6 }}>
        <h1 style={{ margin: 0 }}>Settings</h1>
        <p style={{ margin: 0, color: "var(--muted)" }}>Manage data tools and app preferences in one place.</p>
      </section>

      <section style={{ border: "1px solid var(--line)", borderRadius: 12, background: "var(--surface)", padding: 14, display: "grid", gap: 10 }}>
        <strong>Import Data</strong>
        <div style={{ color: "var(--muted)", fontSize: 14 }}>Upload CSV from POS exports, Google Sheets, or TipTapped backups.</div>
        <div>
          <Link
            href="/app/import"
            style={{ textDecoration: "none", border: "1px solid var(--line)", borderRadius: 8, padding: "9px 12px", background: "var(--surface-2)", color: "var(--text)", display: "inline-flex" }}
          >
            Open Import
          </Link>
        </div>
      </section>

      <section style={{ border: "1px solid var(--line)", borderRadius: 12, background: "var(--surface)", padding: 14, display: "grid", gap: 10 }}>
        <strong>Export Data</strong>
        <div style={{ color: "var(--muted)", fontSize: 14 }}>Download your monthly CSV backup.</div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <input
            type="month"
            value={exportMonth}
            onChange={(e) => setExportMonth(e.target.value)}
            style={{ padding: 10, borderRadius: 8, border: "1px solid var(--line)", background: "var(--surface-2)", color: "var(--text)" }}
          />
          <a href={exportHref} style={{ textDecoration: "none", border: "1px solid var(--line)", borderRadius: 8, padding: "10px 12px", background: "var(--surface-2)", color: "var(--text)" }}>
            Export CSV
          </a>
        </div>
      </section>

      <section style={{ border: "1px solid var(--line)", borderRadius: 12, background: "var(--surface)", padding: 14, display: "grid", gap: 8 }}>
        <strong>More Settings (Next)</strong>
        <ul style={{ margin: 0, paddingLeft: 18, color: "var(--muted)", display: "grid", gap: 6 }}>
          <li>Default tipout rules by venue</li>
          <li>Receipt OCR templates by restaurant/POS</li>
          <li>Account and notification preferences</li>
        </ul>
      </section>
    </main>
  );
}
