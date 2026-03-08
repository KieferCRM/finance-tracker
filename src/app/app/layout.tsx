"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/browser";

function HeaderBeeMascot() {
  return (
    <svg width="30" height="30" viewBox="0 0 64 64" role="img" aria-label="TipTapped bee mascot">
      <ellipse cx="22" cy="25" rx="8" ry="11" fill="rgba(236, 244, 255, 0.88)" transform="rotate(-24 22 25)" />
      <ellipse cx="42" cy="25" rx="8" ry="11" fill="rgba(236, 244, 255, 0.88)" transform="rotate(24 42 25)" />
      <ellipse cx="32" cy="35" rx="16" ry="13" fill="#f5c400" />
      <rect x="18" y="29" width="28" height="4" rx="2" fill="#1c2740" />
      <rect x="18" y="36" width="28" height="4" rx="2" fill="#1c2740" />
      <circle cx="32" cy="22" r="9" fill="#1c2740" />
      <circle cx="28.5" cy="21.5" r="1.4" fill="#f4f9ff" />
      <circle cx="35.5" cy="21.5" r="1.4" fill="#f4f9ff" />
      <path d="M29 25 q3 2 6 0" stroke="#f4f9ff" strokeWidth="1.6" fill="none" strokeLinecap="round" />
      <path d="M27 15 q-3 -6 -8 -7" stroke="#1c2740" strokeWidth="2" fill="none" strokeLinecap="round" />
      <path d="M37 15 q3 -6 8 -7" stroke="#1c2740" strokeWidth="2" fill="none" strokeLinecap="round" />
      <circle cx="18.5" cy="7.5" r="2" fill="#ffd84d" />
      <circle cx="45.5" cy="7.5" r="2" fill="#ffd84d" />
    </svg>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = useMemo(() => supabaseBrowser(), []);
  const [loggingOut, setLoggingOut] = useState(false);
  const navItems = [
    { href: "/app/calendar", label: "Calendar", isActive: pathname === "/app" || pathname === "/app/calendar" },
    { href: "/app/scanner", label: "Scanner", isActive: pathname === "/app/scanner" },
    { href: "/app/ledger", label: "Ledger", isActive: pathname === "/app/ledger" },
    { href: "/app/history", label: "History", isActive: pathname === "/app/history" },
    { href: "/app/report", label: "Report", isActive: pathname === "/app/report" },
    { href: "/app/settings", label: "Settings", isActive: pathname === "/app/settings" },
  ];

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
      <header
        style={{
          display: "grid",
          gap: 10,
          marginBottom: 14,
          border: "1px solid rgba(255, 216, 77, 0.72)",
          borderRadius: 14,
          padding: 10,
          background: "linear-gradient(180deg, rgba(255, 216, 77, 0.13) 0%, rgba(17, 27, 48, 0) 100%)",
        }}
      >
        <div style={{ display: "grid", gap: 2 }}>
          <div style={{ fontWeight: 800, display: "flex", alignItems: "center", gap: 8 }}>
            <HeaderBeeMascot />
            <span style={{ letterSpacing: 0.3 }}>TIPTAPPED</span>
          </div>
          <div style={{ fontSize: 11, color: "var(--muted)", letterSpacing: 0.2 }}>BarMath for Bartenders</div>
        </div>
        <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4 }}>
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              style={{
                border: item.isActive ? "1px solid rgba(255, 216, 77, 0.9)" : "1px solid var(--line)",
                borderRadius: 999,
                padding: "7px 12px",
                whiteSpace: "nowrap",
                textDecoration: "none",
                background: item.isActive ? "rgba(255, 216, 77, 0.16)" : "var(--surface-2)",
                color: item.isActive ? "var(--neon)" : "var(--text)",
                fontWeight: item.isActive ? 700 : 500,
              }}
            >
              {item.label}
            </Link>
          ))}
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
