"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";

const TODAY = new Date().toISOString().slice(0, 10);
const MONTH = TODAY.slice(0, 7);

const CATEGORIES = [
  "food",
  "alcohol",
  "rides",
  "rent",
  "utilities",
  "phone",
  "shopping",
  "entertainment",
  "savings",
  "other",
];

type IncomeRow = {
  id: string;
  shift_date: string;
  cash_tips: number;
  card_tips: number;
  hours_worked: number;
  note: string | null;
};

type ExpenseRow = {
  id: string;
  expense_date: string;
  category: string;
  amount: number;
  note: string | null;
};

function money(value: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value || 0);
}

export default function LedgerPage() {
  const [incomeRows, setIncomeRows] = useState<IncomeRow[]>([]);
  const [expenseRows, setExpenseRows] = useState<ExpenseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [savingIncome, setSavingIncome] = useState(false);
  const [savingExpense, setSavingExpense] = useState(false);

  const [shiftDate, setShiftDate] = useState(TODAY);
  const [cashTips, setCashTips] = useState("0");
  const [cardTips, setCardTips] = useState("0");
  const [hoursWorked, setHoursWorked] = useState("0");
  const [incomeNote, setIncomeNote] = useState("");

  const [expenseDate, setExpenseDate] = useState(TODAY);
  const [category, setCategory] = useState("food");
  const [amount, setAmount] = useState("0");
  const [expenseNote, setExpenseNote] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    const [incomeRes, expenseRes] = await Promise.all([
      fetch(`/api/income?month=${MONTH}&limit=200`),
      fetch(`/api/expenses?month=${MONTH}&limit=200`),
    ]);

    if (!incomeRes.ok || !expenseRes.ok) {
      setError("Could not load ledger data.");
      setLoading(false);
      return;
    }

    const incomeJson = (await incomeRes.json()) as { rows: IncomeRow[] };
    const expenseJson = (await expenseRes.json()) as { rows: ExpenseRow[] };

    setIncomeRows(incomeJson.rows ?? []);
    setExpenseRows(expenseJson.rows ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function onIncomeSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSavingIncome(true);
    setError("");

    const res = await fetch("/api/income", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        shift_date: shiftDate,
        cash_tips: cashTips,
        card_tips: cardTips,
        hours_worked: hoursWorked,
        note: incomeNote,
      }),
    });

    if (!res.ok) {
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      setError(json.error ?? "Failed to save income entry.");
      setSavingIncome(false);
      return;
    }

    setCashTips("0");
    setCardTips("0");
    setHoursWorked("0");
    setIncomeNote("");
    setSavingIncome(false);
    void load();
  }

  async function onExpenseSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSavingExpense(true);
    setError("");

    const res = await fetch("/api/expenses", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        expense_date: expenseDate,
        category,
        amount,
        note: expenseNote,
      }),
    });

    if (!res.ok) {
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      setError(json.error ?? "Failed to save expense entry.");
      setSavingExpense(false);
      return;
    }

    setAmount("0");
    setExpenseNote("");
    setSavingExpense(false);
    void load();
  }

  async function removeIncome(id: string) {
    const res = await fetch(`/api/income/${id}`, { method: "DELETE" });
    if (!res.ok) {
      setError("Failed to delete income entry.");
      return;
    }
    setIncomeRows((prev) => prev.filter((row) => row.id !== id));
  }

  async function removeExpense(id: string) {
    const res = await fetch(`/api/expenses/${id}`, { method: "DELETE" });
    if (!res.ok) {
      setError("Failed to delete expense entry.");
      return;
    }
    setExpenseRows((prev) => prev.filter((row) => row.id !== id));
  }

  return (
    <main style={{ display: "grid", gap: 14 }}>
      <section style={{ border: "1px solid var(--line)", borderRadius: 12, background: "var(--surface)", padding: 14 }}>
        <h1 style={{ marginTop: 0, marginBottom: 6 }}>Ledger</h1>
        <p style={{ margin: 0, color: "var(--muted)" }}>Track all monthly income and expenses in one place.</p>
      </section>

      {error ? <section style={{ color: "var(--danger)" }}>{error}</section> : null}

      <section id="income" style={{ border: "1px solid var(--line)", borderRadius: 12, background: "var(--surface)", padding: 14 }}>
        <h2 style={{ marginTop: 0 }}>Add Income</h2>
        <form onSubmit={onIncomeSubmit} style={{ display: "grid", gap: 10 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 8 }}>
            <input type="date" value={shiftDate} onChange={(e) => setShiftDate(e.target.value)} required style={{ padding: 10, borderRadius: 8, border: "1px solid var(--line)", background: "var(--surface-2)", color: "var(--text)" }} />
            <input type="number" step="0.01" min="0" placeholder="Cash tips" value={cashTips} onChange={(e) => setCashTips(e.target.value)} style={{ padding: 10, borderRadius: 8, border: "1px solid var(--line)", background: "var(--surface-2)", color: "var(--text)" }} />
            <input type="number" step="0.01" min="0" placeholder="Card tips" value={cardTips} onChange={(e) => setCardTips(e.target.value)} style={{ padding: 10, borderRadius: 8, border: "1px solid var(--line)", background: "var(--surface-2)", color: "var(--text)" }} />
            <input type="number" step="0.25" min="0" placeholder="Hours worked" value={hoursWorked} onChange={(e) => setHoursWorked(e.target.value)} style={{ padding: 10, borderRadius: 8, border: "1px solid var(--line)", background: "var(--surface-2)", color: "var(--text)" }} />
          </div>
          <textarea placeholder="Note (optional)" value={incomeNote} onChange={(e) => setIncomeNote(e.target.value)} rows={2} style={{ padding: 10, borderRadius: 8, border: "1px solid var(--line)", background: "var(--surface-2)", color: "var(--text)" }} />
          <div>
            <button type="submit" disabled={savingIncome} style={{ border: "none", borderRadius: 8, padding: "10px 14px", background: "var(--neon)", color: "#111", fontWeight: 800 }}>
              {savingIncome ? "Saving..." : "Save Income"}
            </button>
          </div>
        </form>
      </section>

      <section id="expenses" style={{ border: "1px solid var(--line)", borderRadius: 12, background: "var(--surface)", padding: 14 }}>
        <h2 style={{ marginTop: 0 }}>Add Expense</h2>
        <form onSubmit={onExpenseSubmit} style={{ display: "grid", gap: 10 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 8 }}>
            <input type="date" value={expenseDate} onChange={(e) => setExpenseDate(e.target.value)} required style={{ padding: 10, borderRadius: 8, border: "1px solid var(--line)", background: "var(--surface-2)", color: "var(--text)" }} />
            <select value={category} onChange={(e) => setCategory(e.target.value)} style={{ padding: 10, borderRadius: 8, border: "1px solid var(--line)", background: "var(--surface-2)", color: "var(--text)" }}>
              {CATEGORIES.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
            <input type="number" step="0.01" min="0" placeholder="Amount" value={amount} onChange={(e) => setAmount(e.target.value)} style={{ padding: 10, borderRadius: 8, border: "1px solid var(--line)", background: "var(--surface-2)", color: "var(--text)" }} />
          </div>
          <textarea placeholder="Note (optional)" value={expenseNote} onChange={(e) => setExpenseNote(e.target.value)} rows={2} style={{ padding: 10, borderRadius: 8, border: "1px solid var(--line)", background: "var(--surface-2)", color: "var(--text)" }} />
          <div>
            <button type="submit" disabled={savingExpense} style={{ border: "none", borderRadius: 8, padding: "10px 14px", background: "var(--neon)", color: "#111", fontWeight: 800 }}>
              {savingExpense ? "Saving..." : "Save Expense"}
            </button>
          </div>
        </form>
      </section>

      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 12 }}>
        <article style={{ border: "1px solid var(--line)", borderRadius: 12, background: "var(--surface)", padding: 14 }}>
          <h2 style={{ marginTop: 0 }}>This Month's Income</h2>
          {loading ? <p style={{ color: "var(--muted)" }}>Loading...</p> : null}
          {!loading && incomeRows.length === 0 ? <p style={{ color: "var(--muted)" }}>No income entries yet.</p> : null}
          {!loading && incomeRows.length > 0 ? (
            <div style={{ display: "grid", gap: 8 }}>
              {incomeRows.map((row) => (
                <article key={row.id} style={{ border: "1px solid var(--line)", borderRadius: 10, padding: 10, background: "var(--surface-2)", display: "grid", gap: 4 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                    <strong>{row.shift_date}</strong>
                    <span>{money(Number(row.cash_tips) + Number(row.card_tips))}</span>
                  </div>
                  <div style={{ color: "var(--muted)", fontSize: 13 }}>
                    Cash {money(Number(row.cash_tips))}, Card {money(Number(row.card_tips))}, Hours {Number(row.hours_worked).toFixed(1)}
                  </div>
                  {row.note ? <div style={{ color: "var(--muted)", fontSize: 13 }}>{row.note}</div> : null}
                  <div>
                    <button onClick={() => void removeIncome(row.id)} style={{ border: "1px solid var(--line)", borderRadius: 7, background: "transparent", color: "var(--text)", padding: "5px 8px" }}>
                      Delete
                    </button>
                  </div>
                </article>
              ))}
            </div>
          ) : null}
        </article>

        <article style={{ border: "1px solid var(--line)", borderRadius: 12, background: "var(--surface)", padding: 14 }}>
          <h2 style={{ marginTop: 0 }}>This Month's Expenses</h2>
          {loading ? <p style={{ color: "var(--muted)" }}>Loading...</p> : null}
          {!loading && expenseRows.length === 0 ? <p style={{ color: "var(--muted)" }}>No expenses logged yet.</p> : null}
          {!loading && expenseRows.length > 0 ? (
            <div style={{ display: "grid", gap: 8 }}>
              {expenseRows.map((row) => (
                <article key={row.id} style={{ border: "1px solid var(--line)", borderRadius: 10, padding: 10, background: "var(--surface-2)", display: "grid", gap: 4 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                    <strong>{row.expense_date}</strong>
                    <span>{money(Number(row.amount))}</span>
                  </div>
                  <div style={{ color: "var(--muted)", fontSize: 13 }}>Category: {row.category}</div>
                  {row.note ? <div style={{ color: "var(--muted)", fontSize: 13 }}>{row.note}</div> : null}
                  <div>
                    <button onClick={() => void removeExpense(row.id)} style={{ border: "1px solid var(--line)", borderRadius: 7, background: "transparent", color: "var(--text)", padding: "5px 8px" }}>
                      Delete
                    </button>
                  </div>
                </article>
              ))}
            </div>
          ) : null}
        </article>
      </section>
    </main>
  );
}
