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
    <div style={{ padding: 20 }}>
      <header style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
        <div style={{ display: "grid", gap: 2 }}>
          <div style={{ fontWeight: 800 }}>TIPTAPPED</div>
          <div style={{ fontSize: 11, color: "var(--muted)", letterSpacing: 0.2 }}>BarMath for Bartenders</div>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Link href="/app">Calendar</Link>
          <Link href="/app/ledger">Ledger</Link>
          <Link href="/app/import">Import</Link>
          <Link href="/app/history">History</Link>
          <Link href="/app/report">Report</Link>
          <button
            onClick={() => void logout()}
            disabled={loggingOut}
            style={{ border: "1px solid var(--line)", borderRadius: 8, background: "var(--surface-2)", color: "var(--text)", padding: "6px 10px" }}
          >
            {loggingOut ? "Logging out..." : "Logout"}
          </button>
        </div>
      </header>
      {children}
    </div>
  );
}
