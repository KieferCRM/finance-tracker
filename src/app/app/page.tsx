"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

const CURRENT_MONTH = new Date().toISOString().slice(0, 7);

type DashboardData = {
  report: {
    totalIncome: number;
    totalExpenses: number;
    savingsAmount: number;
    savingsRate: number;
    shiftCount: number;
    avgShiftIncome: number;
    insights: string[];
  };
};

type IncomeRow = {
  id: string;
  shift_date: string;
  cash_tips: number;
  card_tips: number;
  hours_worked: number;
};

type ExpenseRow = {
  id: string;
  expense_date: string;
  category: string;
  amount: number;
};

function money(value: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value || 0);
}

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [recentIncome, setRecentIncome] = useState<IncomeRow[]>([]);
  const [recentExpenses, setRecentExpenses] = useState<ExpenseRow[]>([]);

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError("");

      const [reportRes, incomeRes, expenseRes] = await Promise.all([
        fetch(`/api/report/monthly?month=${CURRENT_MONTH}`),
        fetch(`/api/income?month=${CURRENT_MONTH}&limit=5`),
        fetch(`/api/expenses?month=${CURRENT_MONTH}&limit=5`),
      ]);

      if (!active) return;
      if (!reportRes.ok || !incomeRes.ok || !expenseRes.ok) {
        setError("Could not load dashboard data.");
        setLoading(false);
        return;
      }

      const reportJson = (await reportRes.json()) as DashboardData;
      const incomeJson = (await incomeRes.json()) as { rows: IncomeRow[] };
      const expenseJson = (await expenseRes.json()) as { rows: ExpenseRow[] };

      if (!active) return;
      setDashboard(reportJson);
      setRecentIncome(incomeJson.rows ?? []);
      setRecentExpenses(expenseJson.rows ?? []);
      setLoading(false);
    }

    void load();
    return () => {
      active = false;
    };
  }, []);

  const cards = useMemo(() => {
    if (!dashboard) return [];
    return [
      { label: "Income", value: money(dashboard.report.totalIncome), href: "/app/ledger#income" },
      { label: "Expenses", value: money(dashboard.report.totalExpenses), href: "/app/ledger#expenses" },
      { label: "Saved", value: money(dashboard.report.savingsAmount), href: "/app/report" },
      { label: "Savings Rate", value: `${dashboard.report.savingsRate.toFixed(1)}%`, href: "/app/report" },
    ];
  }, [dashboard]);

  return (
    <main style={{ display: "grid", gap: 16 }}>
      <section style={{ border: "1px solid var(--line)", borderRadius: 14, background: "var(--surface)", padding: 16 }}>
        <div style={{ color: "var(--mint)", fontSize: 12, fontWeight: 700 }}>TONIGHT'S DAMAGE</div>
        <h1 style={{ margin: "6px 0 8px" }}>Your shift money dashboard</h1>
        <p style={{ margin: 0, color: "var(--muted)" }}>Free: manual tracking and monthly report. Pro: bank sync and deeper savings prompts.</p>
      </section>

      {error ? <section style={{ color: "var(--danger)" }}>{error}</section> : null}

      {loading ? (
        <section style={{ color: "var(--muted)" }}>Loading dashboard...</section>
      ) : (
        <>
          <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
            {cards.map((card) => (
              <Link
                key={card.label}
                href={card.href}
                style={{
                  border: "1px solid var(--line)",
                  borderRadius: 12,
                  background: "var(--surface)",
                  padding: 14,
                  textDecoration: "none",
                  display: "grid",
                  gap: 6,
                }}
              >
                <span style={{ fontSize: 12, color: "var(--muted)" }}>{card.label}</span>
                <span style={{ fontSize: 24, fontWeight: 800 }}>{card.value}</span>
              </Link>
            ))}
          </section>

          <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 12 }}>
            <article style={{ border: "1px solid var(--line)", borderRadius: 12, background: "var(--surface)", padding: 14 }}>
              <h2 style={{ marginTop: 0 }}>Latest Income</h2>
              {recentIncome.length === 0 ? (
                <p style={{ color: "var(--muted)" }}>No shifts logged this month.</p>
              ) : (
                <ul style={{ margin: 0, paddingLeft: 18, display: "grid", gap: 8 }}>
                  {recentIncome.map((row) => (
                    <li key={row.id}>
                      <strong>{row.shift_date}</strong> ({money(Number(row.cash_tips) + Number(row.card_tips))}, {Number(row.hours_worked).toFixed(1)} hrs)
                    </li>
                  ))}
                </ul>
              )}
            </article>

            <article style={{ border: "1px solid var(--line)", borderRadius: 12, background: "var(--surface)", padding: 14 }}>
              <h2 style={{ marginTop: 0 }}>Latest Expenses</h2>
              {recentExpenses.length === 0 ? (
                <p style={{ color: "var(--muted)" }}>No expenses logged this month.</p>
              ) : (
                <ul style={{ margin: 0, paddingLeft: 18, display: "grid", gap: 8 }}>
                  {recentExpenses.map((row) => (
                    <li key={row.id}>
                      <strong>{row.expense_date}</strong> {row.category} ({money(Number(row.amount))})
                    </li>
                  ))}
                </ul>
              )}
            </article>
          </section>

          <section style={{ border: "1px solid var(--line)", borderRadius: 12, background: "var(--surface)", padding: 14 }}>
            <h2 style={{ marginTop: 0 }}>Could've Saved More</h2>
            <ul style={{ margin: 0, paddingLeft: 18, display: "grid", gap: 8 }}>
              {(dashboard?.report.insights ?? []).map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </section>
        </>
      )}
    </main>
  );
}
