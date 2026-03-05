"use client";

import { useEffect, useMemo, useState } from "react";

type IncomeRow = {
  id: string;
  shift_date: string;
  cash_tips: number;
  card_tips: number;
  hours_worked: number;
  note: string | null;
  created_at?: string;
};

type ExpenseRow = {
  id: string;
  expense_date: string;
  category: string;
  amount: number;
  note: string | null;
  created_at?: string;
};

type Entry =
  | {
      id: string;
      type: "income";
      date: string;
      amount: number;
      detail: string;
      note: string | null;
      created_at: string;
    }
  | {
      id: string;
      type: "expense";
      date: string;
      amount: number;
      detail: string;
      note: string | null;
      created_at: string;
    };

function money(value: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value || 0);
}

export default function HistoryPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [incomeRows, setIncomeRows] = useState<IncomeRow[]>([]);
  const [expenseRows, setExpenseRows] = useState<ExpenseRow[]>([]);
  const [monthFilter, setMonthFilter] = useState("all");

  useEffect(() => {
    let active = true;

    async function loadAll() {
      setLoading(true);
      setError("");

      const [incomeRes, expenseRes] = await Promise.all([
        fetch("/api/income?limit=5000"),
        fetch("/api/expenses?limit=5000"),
      ]);

      if (!active) return;
      if (!incomeRes.ok || !expenseRes.ok) {
        setError("Failed to load full history.");
        setLoading(false);
        return;
      }

      const incomeJson = (await incomeRes.json()) as { rows: IncomeRow[] };
      const expenseJson = (await expenseRes.json()) as { rows: ExpenseRow[] };
      if (!active) return;

      setIncomeRows(incomeJson.rows ?? []);
      setExpenseRows(expenseJson.rows ?? []);
      setLoading(false);
    }

    void loadAll();
    return () => {
      active = false;
    };
  }, []);

  const monthOptions = useMemo(() => {
    const months = new Set<string>();
    for (const row of incomeRows) months.add(row.shift_date.slice(0, 7));
    for (const row of expenseRows) months.add(row.expense_date.slice(0, 7));
    return Array.from(months).sort().reverse();
  }, [incomeRows, expenseRows]);

  const entries = useMemo(() => {
    const all: Entry[] = [
      ...incomeRows.map((row) => ({
        id: row.id,
        type: "income" as const,
        date: row.shift_date,
        amount: Number(row.cash_tips) + Number(row.card_tips),
        detail: `${Number(row.hours_worked).toFixed(1)}h`,
        note: row.note,
        created_at: row.created_at ?? "",
      })),
      ...expenseRows.map((row) => ({
        id: row.id,
        type: "expense" as const,
        date: row.expense_date,
        amount: Number(row.amount),
        detail: row.category,
        note: row.note,
        created_at: row.created_at ?? "",
      })),
    ];

    const filtered = monthFilter === "all" ? all : all.filter((entry) => entry.date.startsWith(monthFilter));
    return filtered.sort((a, b) => {
      if (a.date !== b.date) return b.date.localeCompare(a.date);
      return b.created_at.localeCompare(a.created_at);
    });
  }, [incomeRows, expenseRows, monthFilter]);

  const totals = useMemo(() => {
    const income = entries.filter((entry) => entry.type === "income").reduce((sum, entry) => sum + entry.amount, 0);
    const expenses = entries.filter((entry) => entry.type === "expense").reduce((sum, entry) => sum + entry.amount, 0);
    return { income, expenses, net: income - expenses };
  }, [entries]);

  return (
    <main style={{ display: "grid", gap: 14 }}>
      <section style={{ border: "1px solid var(--line)", borderRadius: 12, background: "var(--surface)", padding: 14, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ margin: "0 0 6px" }}>Full History</h1>
          <div style={{ color: "var(--muted)" }}>Every income and expense in one timeline.</div>
        </div>
        <select value={monthFilter} onChange={(e) => setMonthFilter(e.target.value)} style={{ padding: 10, borderRadius: 8, border: "1px solid var(--line)", background: "var(--surface-2)", color: "var(--text)" }}>
          <option value="all">All Months</option>
          {monthOptions.map((month) => (
            <option key={month} value={month}>
              {month}
            </option>
          ))}
        </select>
      </section>

      {error ? <section style={{ color: "var(--danger)" }}>{error}</section> : null}

      <section style={{ border: "1px solid var(--line)", borderRadius: 12, background: "var(--surface)", padding: 12, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
        <article style={{ border: "1px solid var(--line)", borderRadius: 10, background: "var(--surface-2)", padding: 10 }}>
          <div style={{ color: "var(--muted)", fontSize: 12 }}>Income</div>
          <div style={{ fontSize: 22, fontWeight: 800 }}>{money(totals.income)}</div>
        </article>
        <article style={{ border: "1px solid var(--line)", borderRadius: 10, background: "var(--surface-2)", padding: 10 }}>
          <div style={{ color: "var(--muted)", fontSize: 12 }}>Expenses</div>
          <div style={{ fontSize: 22, fontWeight: 800 }}>{money(totals.expenses)}</div>
        </article>
        <article style={{ border: "1px solid var(--line)", borderRadius: 10, background: "var(--surface-2)", padding: 10 }}>
          <div style={{ color: "var(--muted)", fontSize: 12 }}>Net</div>
          <div style={{ fontSize: 22, fontWeight: 800 }}>{money(totals.net)}</div>
        </article>
      </section>

      <section style={{ border: "1px solid var(--line)", borderRadius: 12, background: "var(--surface)", padding: 12 }}>
        {loading ? <p style={{ color: "var(--muted)" }}>Loading history...</p> : null}
        {!loading && entries.length === 0 ? <p style={{ color: "var(--muted)" }}>No entries for this filter.</p> : null}
        {!loading && entries.length > 0 ? (
          <div style={{ display: "grid", gap: 8 }}>
            {entries.map((entry) => (
              <article key={`${entry.type}-${entry.id}`} style={{ border: "1px solid var(--line)", borderRadius: 10, background: "var(--surface-2)", padding: 10, display: "grid", gap: 4 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <span
                      style={{
                        fontSize: 11,
                        padding: "2px 7px",
                        borderRadius: 999,
                        border: "1px solid var(--line)",
                        background: entry.type === "income" ? "#13281a" : "#2a1818",
                        color: entry.type === "income" ? "var(--mint)" : "#ff9a9a",
                        fontWeight: 700,
                      }}
                    >
                      {entry.type.toUpperCase()}
                    </span>
                    <strong>{entry.date}</strong>
                  </div>
                  <strong>{entry.type === "income" ? money(entry.amount) : `-${money(entry.amount)}`}</strong>
                </div>
                <div style={{ color: "var(--muted)", fontSize: 13 }}>{entry.detail}</div>
                {entry.note ? <div style={{ color: "var(--muted)", fontSize: 13 }}>{entry.note}</div> : null}
              </article>
            ))}
          </div>
        ) : null}
      </section>
    </main>
  );
}
