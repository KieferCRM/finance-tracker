"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePlaidLink } from "react-plaid-link";
import type { PlaidLinkOnSuccessMetadata } from "react-plaid-link";

type BankStatus = {
  items: Array<{ id: string; plaid_item_id: string; institution_name: string | null }>;
  accounts: Array<{
    id: string;
    bank_item_id: string;
    name: string;
    mask: string | null;
    account_subtype: string | null;
    current_balance: number | null;
  }>;
  recent_transactions: Array<{
    id: string;
    transaction_date: string | null;
    name: string | null;
    amount: number;
    pending: boolean;
  }>;
};

function money(value: number | null): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(value ?? 0));
}

export default function BankPage() {
  const [status, setStatus] = useState<BankStatus>({ items: [], accounts: [], recent_transactions: [] });
  const [linkToken, setLinkToken] = useState("");
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState("");

  const loadStatus = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/bank/status");
    if (!res.ok) {
      setError("Failed to load bank status.");
      setLoading(false);
      return;
    }
    const json = (await res.json()) as BankStatus;
    setStatus(json);
    setLoading(false);
  }, []);

  const createLinkToken = useCallback(async () => {
    const res = await fetch("/api/bank/link-token", { method: "POST" });
    if (!res.ok) {
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      setError(json.error ?? "Failed to create bank link token.");
      return;
    }
    const json = (await res.json()) as { link_token: string };
    setLinkToken(json.link_token);
  }, []);

  useEffect(() => {
    void Promise.all([loadStatus(), createLinkToken()]);
  }, [createLinkToken, loadStatus]);

  const config = useMemo(
    () => ({
      token: linkToken,
      onSuccess: async (publicToken: string, metadata: PlaidLinkOnSuccessMetadata) => {
        setError("");
        const res = await fetch("/api/bank/exchange-public-token", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            public_token: publicToken,
            institution_id: metadata?.institution?.institution_id ?? null,
            institution_name: metadata?.institution?.name ?? null,
          }),
        });

        if (!res.ok) {
          const json = (await res.json().catch(() => ({}))) as { error?: string };
          setError(json.error ?? "Bank connection failed.");
          return;
        }

        await loadStatus();
      },
    }),
    [linkToken, loadStatus]
  );

  const { open, ready } = usePlaidLink(config);

  async function syncTransactions() {
    setSyncing(true);
    setError("");
    const res = await fetch("/api/bank/sync", { method: "POST", headers: { "content-type": "application/json" }, body: "{}" });
    if (!res.ok) {
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      setError(json.error ?? "Sync failed.");
      setSyncing(false);
      return;
    }
    await loadStatus();
    setSyncing(false);
  }

  return (
    <main style={{ display: "grid", gap: 14 }}>
      <section style={{ border: "1px solid var(--line)", borderRadius: 12, background: "var(--surface)", padding: 14 }}>
        <h1 style={{ margin: "0 0 8px" }}>Bank Integration</h1>
        <p style={{ marginTop: 0, color: "var(--muted)" }}>
          Pro feature: connect your bank with Plaid, then sync transactions into TipTab.
        </p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button
            onClick={() => open()}
            disabled={!ready || !linkToken}
            style={{ border: "none", borderRadius: 8, padding: "10px 14px", background: "var(--neon)", color: "#111", fontWeight: 800 }}
          >
            Connect Bank
          </button>
          <button
            onClick={() => void syncTransactions()}
            disabled={syncing || status.items.length === 0}
            style={{ border: "1px solid var(--line)", borderRadius: 8, padding: "10px 14px", background: "var(--surface-2)", color: "var(--text)", fontWeight: 700 }}
          >
            {syncing ? "Syncing..." : "Sync Transactions"}
          </button>
        </div>
        {error ? <div style={{ marginTop: 10, color: "var(--danger)" }}>{error}</div> : null}
      </section>

      <section style={{ border: "1px solid var(--line)", borderRadius: 12, background: "var(--surface)", padding: 14 }}>
        <h2 style={{ marginTop: 0 }}>Connected Items</h2>
        {loading ? <p style={{ color: "var(--muted)" }}>Loading...</p> : null}
        {!loading && status.items.length === 0 ? <p style={{ color: "var(--muted)" }}>No banks connected yet.</p> : null}
        {!loading && status.items.length > 0 ? (
          <ul style={{ margin: 0, paddingLeft: 18, display: "grid", gap: 8 }}>
            {status.items.map((item) => (
              <li key={item.id}>{item.institution_name ?? "Unknown institution"}</li>
            ))}
          </ul>
        ) : null}
      </section>

      <section style={{ border: "1px solid var(--line)", borderRadius: 12, background: "var(--surface)", padding: 14 }}>
        <h2 style={{ marginTop: 0 }}>Accounts</h2>
        {status.accounts.length === 0 ? <p style={{ color: "var(--muted)" }}>No accounts yet.</p> : null}
        {status.accounts.length > 0 ? (
          <div style={{ display: "grid", gap: 8 }}>
            {status.accounts.map((acct) => (
              <article key={acct.id} style={{ border: "1px solid var(--line)", borderRadius: 10, padding: 10, background: "var(--surface-2)" }}>
                <strong>{acct.name}</strong>
                <div style={{ color: "var(--muted)", fontSize: 13 }}>
                  {acct.account_subtype ?? "account"}
                  {acct.mask ? ` • ****${acct.mask}` : ""}
                </div>
                <div>{money(acct.current_balance)}</div>
              </article>
            ))}
          </div>
        ) : null}
      </section>

      <section style={{ border: "1px solid var(--line)", borderRadius: 12, background: "var(--surface)", padding: 14 }}>
        <h2 style={{ marginTop: 0 }}>Recent Synced Transactions</h2>
        {status.recent_transactions.length === 0 ? <p style={{ color: "var(--muted)" }}>Nothing synced yet.</p> : null}
        {status.recent_transactions.length > 0 ? (
          <ul style={{ margin: 0, paddingLeft: 18, display: "grid", gap: 8 }}>
            {status.recent_transactions.map((tx) => (
              <li key={tx.id}>
                {tx.transaction_date ?? "n/a"} - {tx.name ?? "transaction"} ({money(tx.amount)})
                {tx.pending ? " pending" : ""}
              </li>
            ))}
          </ul>
        ) : null}
      </section>
    </main>
  );
}
