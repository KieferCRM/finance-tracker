"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/browser";

export default function AuthPage() {
  const router = useRouter();
  const supabase = useMemo(() => supabaseBrowser(), []);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function signIn() {
    setLoading(true);
    setError("");
    setNotice("");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }
    setLoading(false);
    router.push("/app");
  }

  async function signUp() {
    setLoading(true);
    setError("");
    setNotice("");
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    if (data.session) {
      setLoading(false);
      router.push("/app");
      return;
    }

    setLoading(false);
    setNotice("Account created. Check your email to confirm, then log in.");
  }

  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24 }}>
      <section style={{ width: "min(420px, 100%)", border: "1px solid var(--line)", borderRadius: 14, background: "var(--surface)", padding: 18, display: "grid", gap: 10 }}>
        <h1 style={{ margin: 0 }}>Access TipTab</h1>
        <p style={{ marginTop: 0, color: "var(--muted)", fontSize: 14 }}>BarMath for Bartenders who want less money chaos after shift.</p>

        <input placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} style={{ background: "#0f1217", color: "var(--text)", border: "1px solid var(--line)", borderRadius: 8, padding: 10 }} />
        <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} style={{ background: "#0f1217", color: "var(--text)", border: "1px solid var(--line)", borderRadius: 8, padding: 10 }} />

        {error ? <div style={{ color: "var(--danger)", fontSize: 13 }}>{error}</div> : null}
        {notice ? <div style={{ color: "var(--mint)", fontSize: 13 }}>{notice}</div> : null}

        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={() => void signIn()} disabled={loading} style={{ border: "none", borderRadius: 8, padding: "10px 12px", fontWeight: 700, background: "var(--neon)", color: "#111" }}>
            {loading ? "Loading..." : "Log In"}
          </button>
          <button onClick={() => void signUp()} disabled={loading} style={{ border: "1px solid var(--line)", borderRadius: 8, padding: "10px 12px", fontWeight: 700, background: "var(--surface-2)", color: "var(--text)" }}>
            {loading ? "Loading..." : "Sign Up"}
          </button>
        </div>
      </section>
    </main>
  );
}
