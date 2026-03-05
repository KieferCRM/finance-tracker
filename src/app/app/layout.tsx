"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/browser";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const supabase = useMemo(() => supabaseBrowser(), []);

  async function logout() {
    await supabase.auth.signOut();
    router.push("/auth");
  }

  return (
    <div style={{ padding: 20 }}>
      <header style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
        <div style={{ display: "grid", gap: 2 }}>
          <div style={{ fontWeight: 800 }}>TIPTAP</div>
          <div style={{ fontSize: 11, color: "var(--muted)", letterSpacing: 0.2 }}>BarMath for Bartenders</div>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Link href="/app">Dashboard</Link>
          <Link href="/app/ledger">Ledger</Link>
          <Link href="/app/import">Import</Link>
          <Link href="/app/history">History</Link>
          <Link href="/app/calendar">Calendar</Link>
          <Link href="/app/report">Report</Link>
          <button onClick={() => void logout()} style={{ border: "1px solid var(--line)", borderRadius: 8, background: "var(--surface-2)", color: "var(--text)", padding: "6px 10px" }}>
            Logout
          </button>
        </div>
      </header>
      {children}
    </div>
  );
}
