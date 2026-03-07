"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

const CURRENT_MONTH = new Date().toISOString().slice(0, 7);
const MONTHLY_INCOME_GOAL_KEY = "lcl_monthly_income_goal";
const MONTHLY_SAVINGS_GOAL_KEY = "lcl_monthly_savings_goal";
const BACKUP_REMINDER_PREFIX = "tiptab_backup_reminder_dismissed_";

type ReportResponse = {
  month: string;
  report: {
    totalIncome: number;
    totalExpenses: number;
    savingsAmount: number;
    savingsRate: number;
    shiftCount: number;
    avgShiftIncome: number;
    topCategories: Array<{ category: string; amount: number; pctOfIncome: number }>;
    insights: string[];
  };
};

function money(value: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value || 0);
}

function percentOfGoal(current: number, goal: number): number {
  if (goal <= 0) return 0;
  return Math.max(0, Math.min(100, (current / goal) * 100));
}

export default function ReportPage() {
  const [month, setMonth] = useState(CURRENT_MONTH);
  const [proEnabled, setProEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [data, setData] = useState<ReportResponse | null>(null);
  const [sheetTestMsg, setSheetTestMsg] = useState("");
  const [monthlyIncomeGoal, setMonthlyIncomeGoal] = useState(4500);
  const [monthlySavingsGoal, setMonthlySavingsGoal] = useState(1200);
  const [showBackupReminder, setShowBackupReminder] = useState(false);

  useEffect(() => {
    const incomeGoalRaw = window.localStorage.getItem(MONTHLY_INCOME_GOAL_KEY);
    const savingsGoalRaw = window.localStorage.getItem(MONTHLY_SAVINGS_GOAL_KEY);
    const incomeGoal = Number(incomeGoalRaw);
    const savingsGoal = Number(savingsGoalRaw);

    if (Number.isFinite(incomeGoal) && incomeGoal >= 0) setMonthlyIncomeGoal(incomeGoal);
    if (Number.isFinite(savingsGoal) && savingsGoal >= 0) setMonthlySavingsGoal(savingsGoal);
  }, []);

  useEffect(() => {
    window.localStorage.setItem(MONTHLY_INCOME_GOAL_KEY, String(monthlyIncomeGoal));
  }, [monthlyIncomeGoal]);

  useEffect(() => {
    window.localStorage.setItem(MONTHLY_SAVINGS_GOAL_KEY, String(monthlySavingsGoal));
  }, [monthlySavingsGoal]);

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError("");
      const res = await fetch(`/api/report/monthly?month=${month}`);
      if (!active) return;
      if (!res.ok) {
        setError("Failed to load report.");
        setLoading(false);
        return;
      }
      const json = (await res.json()) as ReportResponse;
      if (!active) return;
      setData(json);
      setLoading(false);
    }

    void load();
    return () => {
      active = false;
    };
  }, [month]);

  useEffect(() => {
    let active = true;

    async function loadProStatus() {
      const res = await fetch("/api/bank/status");
      if (!active || !res.ok) return;

      const json = (await res.json().catch(() => ({}))) as { pro_enabled?: boolean };
      if (!active) return;
      setProEnabled(json.pro_enabled === true);
    }

    void loadProStatus();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const key = `${BACKUP_REMINDER_PREFIX}${month}`;
    const dismissed = window.localStorage.getItem(key) === "true";
    setShowBackupReminder(!dismissed);
  }, [month]);

  async function runSheetsTest() {
    setSheetTestMsg("");
    const res = await fetch("/api/integrations/google-sheets/test", { method: "POST" });
    if (!res.ok) {
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      setSheetTestMsg(json.error ?? "Google Sheets test failed.");
      return;
    }
    setSheetTestMsg("Google Sheets test event sent.");
  }

  const forecast = useMemo(() => {
    if (!data) return null;

    const selectedMonth = month;
    const currentMonth = new Date().toISOString().slice(0, 7);

    if (selectedMonth > currentMonth) {
      return {
        state: "future" as const,
        projectedIncome: 0,
        projectedExpenses: 0,
        projectedSavings: 0,
      };
    }

    if (selectedMonth < currentMonth) {
      return {
        state: "past" as const,
        projectedIncome: data.report.totalIncome,
        projectedExpenses: data.report.totalExpenses,
        projectedSavings: data.report.savingsAmount,
      };
    }

    const [yearStr, monthStr] = selectedMonth.split("-");
    const year = Number(yearStr);
    const monthIndex = Number(monthStr) - 1;
    const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
    const elapsedDays = Math.max(1, new Date().getDate());

    const projectedIncome = (data.report.totalIncome / elapsedDays) * daysInMonth;
    const projectedExpenses = (data.report.totalExpenses / elapsedDays) * daysInMonth;
    const projectedSavings = (data.report.savingsAmount / elapsedDays) * daysInMonth;

    return {
      state: "current" as const,
      projectedIncome,
      projectedExpenses,
      projectedSavings,
    };
  }, [data, month]);

  const incomeGoalPct = useMemo(
    () => percentOfGoal(data?.report.totalIncome ?? 0, monthlyIncomeGoal),
    [data?.report.totalIncome, monthlyIncomeGoal]
  );
  const savingsGoalPct = useMemo(
    () => percentOfGoal(data?.report.savingsAmount ?? 0, monthlySavingsGoal),
    [data?.report.savingsAmount, monthlySavingsGoal]
  );

  function dismissBackupReminder() {
    const key = `${BACKUP_REMINDER_PREFIX}${month}`;
    window.localStorage.setItem(key, "true");
    setShowBackupReminder(false);
  }

  return (
    <main style={{ display: "grid", gap: 14 }}>
      <section style={{ border: "1px solid var(--line)", borderRadius: 12, background: "var(--surface)", padding: 14, display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
        <div>
          <h1 style={{ margin: "0 0 6px" }}>Monthly Report</h1>
          <div style={{ color: "var(--muted)" }}>See exactly where tip money went and where to tighten spending next month.</div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} style={{ padding: 10, borderRadius: 8, border: "1px solid var(--line)", background: "var(--surface-2)", color: "var(--text)" }} />
          <a href={`/api/export/monthly?month=${month}`} style={{ textDecoration: "none", border: "1px solid var(--line)", borderRadius: 8, padding: "10px 12px", background: "var(--surface-2)", color: "var(--text)" }}>
            Export CSV
          </a>
        </div>
      </section>

      {showBackupReminder ? (
        <section style={{ border: "1px solid var(--amber)", borderRadius: 12, background: "#2a2214", padding: 12, display: "grid", gap: 8 }}>
          <strong>Backup Reminder</strong>
          <div style={{ color: "var(--muted)", fontSize: 14 }}>
            Export a CSV backup for {month} so your data is safe and easy to share.
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <a
              href={`/api/export/monthly?month=${month}`}
              style={{ textDecoration: "none", border: "1px solid var(--line)", borderRadius: 8, padding: "8px 10px", background: "var(--surface-2)", color: "var(--text)" }}
            >
              Export This Month CSV
            </a>
            <button
              type="button"
              onClick={dismissBackupReminder}
              style={{ border: "1px solid var(--line)", borderRadius: 8, padding: "8px 10px", background: "transparent", color: "var(--text)" }}
            >
              Dismiss
            </button>
          </div>
        </section>
      ) : null}

      <section style={{ border: "1px solid var(--line)", borderRadius: 12, background: "var(--surface)", padding: 12, color: "var(--muted)", fontSize: 14 }}>
        {proEnabled
          ? "Free includes monthly summary and manual tracking. Pro adds bank sync and deeper savings prompts."
          : "Free includes monthly summary and manual tracking. Pro bank sync is under construction pending Plaid approval."}
        <div style={{ marginTop: 8, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <button onClick={() => void runSheetsTest()} style={{ border: "1px solid var(--line)", borderRadius: 8, padding: "7px 10px", background: "var(--surface-2)", color: "var(--text)" }}>
            Test Google Sheets Sync
          </button>
          {sheetTestMsg ? <span>{sheetTestMsg}</span> : null}
        </div>
      </section>

      {error ? <section style={{ color: "var(--danger)" }}>{error}</section> : null}
      {loading ? <section style={{ color: "var(--muted)" }}>Loading report...</section> : null}

      {!loading && data ? (
        <>
          <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
            <article style={{ border: "1px solid var(--line)", borderRadius: 12, background: "var(--surface)", padding: 12 }}>
              <div style={{ color: "var(--muted)", fontSize: 12 }}>Income</div>
              <div style={{ fontSize: 24, fontWeight: 800 }}>{money(data.report.totalIncome)}</div>
            </article>
            <article style={{ border: "1px solid var(--line)", borderRadius: 12, background: "var(--surface)", padding: 12 }}>
              <div style={{ color: "var(--muted)", fontSize: 12 }}>Expenses</div>
              <div style={{ fontSize: 24, fontWeight: 800 }}>{money(data.report.totalExpenses)}</div>
            </article>
            <article style={{ border: "1px solid var(--line)", borderRadius: 12, background: "var(--surface)", padding: 12 }}>
              <div style={{ color: "var(--muted)", fontSize: 12 }}>Savings Logged</div>
              <div style={{ fontSize: 24, fontWeight: 800 }}>{money(data.report.savingsAmount)}</div>
            </article>
            <article style={{ border: "1px solid var(--line)", borderRadius: 12, background: "var(--surface)", padding: 12 }}>
              <div style={{ color: "var(--muted)", fontSize: 12 }}>Savings Rate</div>
              <div style={{ fontSize: 24, fontWeight: 800 }}>{data.report.savingsRate.toFixed(1)}%</div>
            </article>
          </section>

          <section style={{ border: "1px solid var(--line)", borderRadius: 12, background: "var(--surface)", padding: 14, display: "grid", gap: 12 }}>
            <h2 style={{ margin: 0 }}>Goals</h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
              <label style={{ display: "grid", gap: 6 }}>
                <span style={{ color: "var(--muted)", fontSize: 13 }}>Monthly Income Goal</span>
                <input
                  type="number"
                  min="0"
                  step="50"
                  value={monthlyIncomeGoal}
                  onChange={(e) => setMonthlyIncomeGoal(Math.max(0, Number(e.target.value) || 0))}
                  style={{ padding: 10, borderRadius: 8, border: "1px solid var(--line)", background: "var(--surface-2)", color: "var(--text)" }}
                />
              </label>
              <label style={{ display: "grid", gap: 6 }}>
                <span style={{ color: "var(--muted)", fontSize: 13 }}>EOY Savings Goal</span>
                <input
                  type="number"
                  min="0"
                  step="50"
                  value={monthlySavingsGoal}
                  onChange={(e) => setMonthlySavingsGoal(Math.max(0, Number(e.target.value) || 0))}
                  style={{ padding: 10, borderRadius: 8, border: "1px solid var(--line)", background: "var(--surface-2)", color: "var(--text)" }}
                />
              </label>
            </div>

            <div style={{ display: "grid", gap: 8 }}>
              <div style={{ color: "var(--muted)", fontSize: 13 }}>
                Income Progress: {money(data.report.totalIncome)} / {money(monthlyIncomeGoal)} ({incomeGoalPct.toFixed(0)}%)
              </div>
              <div style={{ height: 10, borderRadius: 999, background: "var(--surface-2)", overflow: "hidden" }}>
                <div style={{ width: `${incomeGoalPct}%`, height: "100%", background: "var(--mint)" }} />
              </div>

              <div style={{ color: "var(--muted)", fontSize: 13 }}>
                Savings Logged Progress: {money(data.report.savingsAmount)} / {money(monthlySavingsGoal)} ({savingsGoalPct.toFixed(0)}%)
              </div>
              <div style={{ height: 10, borderRadius: 999, background: "var(--surface-2)", overflow: "hidden" }}>
                <div style={{ width: `${savingsGoalPct}%`, height: "100%", background: "var(--neon)" }} />
              </div>
            </div>
          </section>

          <section style={{ border: "1px solid var(--line)", borderRadius: 12, background: "var(--surface)", padding: 14, display: "grid", gap: 8 }}>
            <h2 style={{ margin: 0 }}>Forecast</h2>
            {forecast?.state === "future" ? (
              <div style={{ color: "var(--muted)" }}>Forecast appears after this month starts.</div>
            ) : null}
            {forecast?.state === "past" ? (
              <div style={{ color: "var(--muted)" }}>Selected month is complete. Projection equals actual totals.</div>
            ) : null}
            {forecast?.state === "current" ? (
              <div style={{ color: "var(--muted)" }}>Projected at current daily pace through month-end.</div>
            ) : null}
            {forecast ? (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
                <article style={{ border: "1px solid var(--line)", borderRadius: 10, padding: 10, background: "var(--surface-2)" }}>
                  <div style={{ color: "var(--muted)", fontSize: 12 }}>Projected Income</div>
                  <div style={{ fontWeight: 800 }}>{money(forecast.projectedIncome)}</div>
                </article>
                <article style={{ border: "1px solid var(--line)", borderRadius: 10, padding: 10, background: "var(--surface-2)" }}>
                  <div style={{ color: "var(--muted)", fontSize: 12 }}>Projected Expenses</div>
                  <div style={{ fontWeight: 800 }}>{money(forecast.projectedExpenses)}</div>
                </article>
                <article style={{ border: "1px solid var(--line)", borderRadius: 10, padding: 10, background: "var(--surface-2)" }}>
                  <div style={{ color: "var(--muted)", fontSize: 12 }}>Projected Savings</div>
                  <div style={{ fontWeight: 800 }}>{money(forecast.projectedSavings)}</div>
                </article>
              </div>
            ) : null}
          </section>

          <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 12 }}>
            <article style={{ border: "1px solid var(--line)", borderRadius: 12, background: "var(--surface)", padding: 14 }}>
              <h2 style={{ marginTop: 0 }}>Top Spend Categories</h2>
              {data.report.topCategories.length === 0 ? (
                <p style={{ color: "var(--muted)" }}>No expenses in this month.</p>
              ) : (
                <ul style={{ margin: 0, paddingLeft: 18, display: "grid", gap: 8 }}>
                  {data.report.topCategories.map((item) => (
                    <li key={item.category}>
                      {item.category}: {money(item.amount)} ({item.pctOfIncome.toFixed(1)}% of income)
                    </li>
                  ))}
                </ul>
              )}
            </article>

            <article style={{ border: "1px solid var(--line)", borderRadius: 12, background: "var(--surface)", padding: 14 }}>
              <h2 style={{ marginTop: 0 }}>Could've Saved More</h2>
              <ul style={{ margin: 0, paddingLeft: 18, display: "grid", gap: 8 }}>
                {data.report.insights.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </article>
          </section>
        </>
      ) : null}
    </main>
  );
}
