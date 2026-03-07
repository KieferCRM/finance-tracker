"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/browser";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const supabase = useMemo(() => supabaseBrowser(), []);
  const [loggingOut, setLoggingOut] = useState(false);

  async function logout() {
    if (loggingOut) return;
    setLoggingOut(true);

    // Local scope avoids relying on a successful network round-trip.
    const { error } = await supabase.auth.signOut({ scope: "local" });
    if (error) {
      console.error("Logout failed:", error.message);
    }

    router.replace("/auth");
    router.refresh();
    window.location.assign("/auth");
  }

  return (
    <div style={{ padding: 12, maxWidth: 780, margin: "0 auto" }}>
      <header style={{ display: "grid", gap: 10, marginBottom: 14 }}>
        <div style={{ display: "grid", gap: 2 }}>
          <div style={{ fontWeight: 800 }}>TIPTAPPED</div>
          <div style={{ fontSize: 11, color: "var(--muted)", letterSpacing: 0.2 }}>BarMath for Bartenders</div>
        </div>
        <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4 }}>
          <Link href="/app" style={{ border: "1px solid var(--line)", borderRadius: 999, padding: "7px 12px", whiteSpace: "nowrap", textDecoration: "none", background: "var(--surface-2)" }}>
            Calendar
          </Link>
          <Link href="/app/ledger" style={{ border: "1px solid var(--line)", borderRadius: 999, padding: "7px 12px", whiteSpace: "nowrap", textDecoration: "none", background: "var(--surface-2)" }}>
            Ledger
          </Link>
          <Link href="/app/import" style={{ border: "1px solid var(--line)", borderRadius: 999, padding: "7px 12px", whiteSpace: "nowrap", textDecoration: "none", background: "var(--surface-2)" }}>
            Import
          </Link>
          <Link href="/app/history" style={{ border: "1px solid var(--line)", borderRadius: 999, padding: "7px 12px", whiteSpace: "nowrap", textDecoration: "none", background: "var(--surface-2)" }}>
            History
          </Link>
          <Link href="/app/report" style={{ border: "1px solid var(--line)", borderRadius: 999, padding: "7px 12px", whiteSpace: "nowrap", textDecoration: "none", background: "var(--surface-2)" }}>
            Report
          </Link>
          <button
            onClick={() => void logout()}
            disabled={loggingOut}
            style={{ border: "1px solid var(--line)", borderRadius: 999, background: "var(--surface-2)", color: "var(--text)", padding: "7px 12px", whiteSpace: "nowrap" }}
          >
            {loggingOut ? "Logging out..." : "Logout"}
          </button>
        </div>
      </header>
      {children}
    </div>
  );
}
