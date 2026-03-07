import Link from "next/link";
import type { ReactNode } from "react";

export function LegalShell({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <main style={{ minHeight: "100vh", padding: 24, display: "grid", placeItems: "start center" }}>
      <div style={{ width: "min(920px, 100%)", display: "grid", gap: 12 }}>
        <header style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          <Link href="/" style={{ textDecoration: "none", color: "var(--mint)", fontWeight: 800, letterSpacing: 0.3 }}>
            TIPTAPPED
          </Link>
          <nav style={{ display: "flex", gap: 12, flexWrap: "wrap", fontSize: 14, color: "var(--muted)" }}>
            <Link href="/legal">Legal</Link>
            <Link href="/legal/privacy">Privacy</Link>
            <Link href="/legal/terms">Terms</Link>
            <Link href="/legal/plaid">Plaid</Link>
            <Link href="/legal/data-retention">Data Retention</Link>
          </nav>
        </header>

        <section style={{ border: "1px solid var(--line)", borderRadius: 16, background: "var(--surface)", padding: 22 }}>
          <h1 style={{ marginTop: 0, marginBottom: 6, fontSize: "clamp(1.7rem, 3.8vw, 2.2rem)" }}>{title}</h1>
          <p style={{ marginTop: 0, color: "var(--muted)", fontSize: 14 }}>Last updated: March 5, 2026</p>
          <div style={{ display: "grid", gap: 14, lineHeight: 1.6 }}>{children}</div>
        </section>
      </div>
    </main>
  );
}
