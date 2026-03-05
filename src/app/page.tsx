import Link from "next/link";

export default function HomePage() {
  return (
    <main style={{ minHeight: "100vh", padding: 24, display: "grid", placeItems: "center" }}>
      <div style={{ width: "min(980px, 100%)", display: "grid", gap: 14 }}>
        <section style={{ border: "1px solid var(--line)", borderRadius: 16, background: "var(--surface)", padding: 24 }}>
          <div style={{ fontSize: 12, color: "var(--mint)", fontWeight: 700, letterSpacing: 0.3 }}>TIPTAP</div>
          <h1 style={{ marginTop: 10, marginBottom: 8, fontSize: "clamp(2rem, 6vw, 3.4rem)", lineHeight: 1.05 }}>
            Track the night. Keep more of it.
          </h1>
          <p style={{ marginTop: 0, color: "var(--muted)", maxWidth: 720 }}>
            BarMath for Bartenders. Track cash and card tips, sync bank transactions, and spot where your money leaked before the next shift.
          </p>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 18 }}>
            <Link href="/auth" style={{ textDecoration: "none", background: "var(--neon)", color: "#111", padding: "10px 14px", borderRadius: 10, fontWeight: 800 }}>
              Start Free
            </Link>
            <Link href="/auth" style={{ textDecoration: "none", border: "1px solid var(--line)", background: "var(--surface-2)", padding: "10px 14px", borderRadius: 10, fontWeight: 700 }}>
              Log In
            </Link>
          </div>
        </section>

        <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
          <article style={{ border: "1px solid var(--line)", borderRadius: 12, background: "var(--surface)", padding: 14 }}>
            <h2 style={{ marginTop: 0, marginBottom: 6, fontSize: 18 }}>Fast Shift Logging</h2>
            <p style={{ margin: 0, color: "var(--muted)", fontSize: 14 }}>Log tips and wages in under 30 seconds after every shift.</p>
          </article>
          <article style={{ border: "1px solid var(--line)", borderRadius: 12, background: "var(--surface)", padding: 14 }}>
            <h2 style={{ marginTop: 0, marginBottom: 6, fontSize: 18 }}>Bank Sync with Plaid</h2>
            <p style={{ margin: 0, color: "var(--muted)", fontSize: 14 }}>Connect accounts and import transactions to cut manual entry.</p>
          </article>
          <article style={{ border: "1px solid var(--line)", borderRadius: 12, background: "var(--surface)", padding: 14 }}>
            <h2 style={{ marginTop: 0, marginBottom: 6, fontSize: 18 }}>Leak Checks</h2>
            <p style={{ margin: 0, color: "var(--muted)", fontSize: 14 }}>See where spending got sloppy and what to fix next month.</p>
          </article>
        </section>

        <section style={{ border: "1px solid var(--line)", borderRadius: 16, background: "var(--surface)", padding: 16 }}>
          <h2 style={{ marginTop: 0, marginBottom: 10 }}>Pricing</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 10 }}>
            <article style={{ border: "1px solid var(--line)", borderRadius: 12, background: "var(--surface-2)", padding: 14, display: "grid", gap: 8 }}>
              <div style={{ color: "var(--mint)", fontWeight: 700, fontSize: 12 }}>FREE</div>
              <div style={{ fontSize: 26, fontWeight: 800 }}>$0</div>
              <div style={{ color: "var(--muted)", fontSize: 14 }}>Perfect for getting started.</div>
              <ul style={{ margin: 0, paddingLeft: 18, display: "grid", gap: 6 }}>
                <li>Manual income and expense tracking</li>
                <li>Current month dashboard</li>
                <li>Basic monthly report</li>
              </ul>
            </article>

            <article style={{ border: "1px solid var(--line)", borderRadius: 12, background: "#182119", padding: 14, display: "grid", gap: 8 }}>
              <div style={{ color: "var(--neon)", fontWeight: 700, fontSize: 12 }}>PRO</div>
              <div style={{ fontSize: 26, fontWeight: 800 }}>$12<span style={{ fontSize: 14, color: "var(--muted)" }}>/month</span></div>
              <div style={{ color: "var(--muted)", fontSize: 14 }}>For tighter take-home control after every shift.</div>
              <ul style={{ margin: 0, paddingLeft: 18, display: "grid", gap: 6 }}>
                <li>Plaid bank sync</li>
                <li>Unlimited month history</li>
                <li>Advanced savings insights</li>
                <li>CSV export for tax prep</li>
              </ul>
            </article>
          </div>
        </section>

        <footer
          style={{
            border: "1px solid var(--line)",
            borderRadius: 12,
            background: "var(--surface)",
            padding: 14,
            display: "flex",
            justifyContent: "space-between",
            gap: 10,
            flexWrap: "wrap",
            color: "var(--muted)",
            fontSize: 14,
          }}
        >
          <span>TipTab</span>
          <span style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <Link href="/legal/privacy">Privacy</Link>
            <Link href="/legal/terms">Terms</Link>
            <Link href="/legal/plaid">Plaid Policy</Link>
            <Link href="/legal/data-retention">Data Retention</Link>
          </span>
        </footer>
      </div>
    </main>
  );
}
