"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/browser";

const MIN_PASSWORD_LENGTH = 8;

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export default function AuthPage() {
  const router = useRouter();
  const supabase = useMemo(() => supabaseBrowser(), []);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [sendingReset, setSendingReset] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [recoveryMode, setRecoveryMode] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("mode") === "recovery") {
        setRecoveryMode(true);
      }
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setRecoveryMode(true);
        setError("");
        setNotice("Set a new password below.");
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase]);

  function normalizedEmail(): string {
    return email.trim().toLowerCase();
  }

  function goToCalendar() {
    router.replace("/app/calendar");
    router.refresh();
    if (typeof window !== "undefined") {
      window.location.assign("/app/calendar");
    }
  }

  async function signIn() {
    const cleanEmail = normalizedEmail();
    if (!isValidEmail(cleanEmail)) {
      setError("Enter a valid email address.");
      return;
    }
    if (!password) {
      setError("Enter your password.");
      return;
    }

    setLoading(true);
    setError("");
    setNotice("");

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password,
    });

    if (signInError) {
      setError(signInError.message);
      setLoading(false);
      return;
    }

    setLoading(false);
    goToCalendar();
  }

  async function signUp() {
    const cleanEmail = normalizedEmail();
    if (!isValidEmail(cleanEmail)) {
      setError("Enter a valid email address.");
      return;
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }

    setLoading(true);
    setError("");
    setNotice("");

    const { data, error: signUpError } = await supabase.auth.signUp({ email: cleanEmail, password });
    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    if (data.session) {
      setLoading(false);
      goToCalendar();
      return;
    }

    setLoading(false);
    setNotice("Account created. Check your email to confirm, then log in.");
  }

  async function sendPasswordReset() {
    const cleanEmail = normalizedEmail();
    if (!isValidEmail(cleanEmail)) {
      setError("Enter a valid email to reset your password.");
      return;
    }

    setSendingReset(true);
    setError("");
    setNotice("");

    const redirectTo = typeof window !== "undefined" ? `${window.location.origin}/auth?mode=recovery` : undefined;

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
      redirectTo,
    });

    if (resetError) {
      setError(resetError.message);
      setSendingReset(false);
      return;
    }

    setSendingReset(false);
    setNotice("Password reset email sent. Open the link on this device to set a new password.");
  }

  async function updateRecoveredPassword() {
    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    setError("");
    setNotice("");

    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) {
      setError(updateError.message);
      setLoading(false);
      return;
    }

    setLoading(false);
    setNotice("Password updated. Redirecting to your calendar...");
    goToCalendar();
  }

  function exitRecoveryMode() {
    setRecoveryMode(false);
    setPassword("");
    setConfirmPassword("");
    setError("");
    setNotice("");
    router.replace("/auth");
  }

  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24 }}>
      <section style={{ width: "min(420px, 100%)", border: "1px solid var(--line)", borderRadius: 14, background: "var(--surface)", padding: 18, display: "grid", gap: 10 }}>
        <h1 style={{ margin: 0 }}>{recoveryMode ? "Reset Your Password" : "Access TipTapped"}</h1>
        <p style={{ marginTop: 0, color: "var(--muted)", fontSize: 14 }}>
          {recoveryMode
            ? "Enter a new password to secure your account."
            : "BarMath for Bartenders who want less money chaos after shift."}
        </p>

        {!recoveryMode ? (
          <>
            <input
              type="email"
              autoComplete="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{ background: "#0f1217", color: "var(--text)", border: "1px solid var(--line)", borderRadius: 8, padding: 10 }}
            />
            <input
              type="password"
              autoComplete="current-password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{ background: "#0f1217", color: "var(--text)", border: "1px solid var(--line)", borderRadius: 8, padding: 10 }}
            />
          </>
        ) : (
          <>
            <input
              type="password"
              autoComplete="new-password"
              placeholder="New password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{ background: "#0f1217", color: "var(--text)", border: "1px solid var(--line)", borderRadius: 8, padding: 10 }}
            />
            <input
              type="password"
              autoComplete="new-password"
              placeholder="Confirm new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              style={{ background: "#0f1217", color: "var(--text)", border: "1px solid var(--line)", borderRadius: 8, padding: 10 }}
            />
          </>
        )}

        {error ? <div style={{ color: "var(--danger)", fontSize: 13 }}>{error}</div> : null}
        {notice ? <div style={{ color: "var(--mint)", fontSize: 13 }}>{notice}</div> : null}

        {!recoveryMode ? (
          <>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button
                onClick={() => void signIn()}
                disabled={loading || sendingReset}
                style={{ border: "none", borderRadius: 8, padding: "10px 12px", fontWeight: 700, background: "var(--neon)", color: "#111" }}
              >
                {loading ? "Loading..." : "Log In"}
              </button>
              <button
                onClick={() => void signUp()}
                disabled={loading || sendingReset}
                style={{ border: "1px solid var(--line)", borderRadius: 8, padding: "10px 12px", fontWeight: 700, background: "var(--surface-2)", color: "var(--text)" }}
              >
                {loading ? "Loading..." : "Sign Up"}
              </button>
              <button
                onClick={() => void sendPasswordReset()}
                disabled={loading || sendingReset}
                style={{ border: "1px solid var(--line)", borderRadius: 8, padding: "10px 12px", fontWeight: 700, background: "transparent", color: "var(--text)" }}
              >
                {sendingReset ? "Sending..." : "Forgot Password"}
              </button>
            </div>
            <div style={{ color: "var(--muted)", fontSize: 12 }}>
              Use at least {MIN_PASSWORD_LENGTH} characters for new accounts.
            </div>
          </>
        ) : (
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button
              onClick={() => void updateRecoveredPassword()}
              disabled={loading}
              style={{ border: "none", borderRadius: 8, padding: "10px 12px", fontWeight: 700, background: "var(--neon)", color: "#111" }}
            >
              {loading ? "Saving..." : "Set New Password"}
            </button>
            <button
              onClick={exitRecoveryMode}
              disabled={loading}
              style={{ border: "1px solid var(--line)", borderRadius: 8, padding: "10px 12px", fontWeight: 700, background: "var(--surface-2)", color: "var(--text)" }}
            >
              Back To Login
            </button>
          </div>
        )}
      </section>
    </main>
  );
}
