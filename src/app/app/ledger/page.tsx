"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

const TODAY = new Date().toISOString().slice(0, 10);
const MONTH = TODAY.slice(0, 7);
const CUSTOM_EXPENSE_CATEGORIES_KEY = "tiptab_custom_expense_categories_v1";

const DEFAULT_EXPENSE_CATEGORIES = ["food", "bar", "rides", "rent", "utilities", "phone", "shopping", "entertainment", "other"];

type EntryType = "income" | "expense" | "savings";

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

function normalizeCategory(value: string): string {
  const normalized = value.trim().toLowerCase();
  return normalized === "alcohol" ? "bar" : normalized;
}

function categoryLabel(value: string): string {
  const normalized = normalizeCategory(value);
  return normalized === "bar" ? "bar" : normalized;
}

export default function LedgerPage() {
  const [incomeRows, setIncomeRows] = useState<IncomeRow[]>([]);
  const [expenseRows, setExpenseRows] = useState<ExpenseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [savingEntry, setSavingEntry] = useState(false);

  const [customExpenseCategories, setCustomExpenseCategories] = useState<string[]>([]);

  const [entryType, setEntryType] = useState<EntryType>("income");
  const [entryDate, setEntryDate] = useState(TODAY);
  const [cashTips, setCashTips] = useState("0");
  const [cardTips, setCardTips] = useState("0");
  const [hoursWorked, setHoursWorked] = useState("0");
  const [category, setCategory] = useState("food");
  const [amount, setAmount] = useState("0");
  const [note, setNote] = useState("");

  const expenseCategoryOptions = useMemo(() => {
    return Array.from(new Set([...DEFAULT_EXPENSE_CATEGORIES, ...customExpenseCategories])).sort();
  }, [customExpenseCategories]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    const [incomeRes, expenseRes] = await Promise.all([fetch(`/api/income?month=${MONTH}&limit=200`), fetch(`/api/expenses?month=${MONTH}&limit=200`)]);

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

  useEffect(() => {
    const stored = window.localStorage.getItem(CUSTOM_EXPENSE_CATEGORIES_KEY);
    if (!stored) return;

    try {
      const parsed = JSON.parse(stored) as unknown;
      if (!Array.isArray(parsed)) return;

      const cleaned = parsed
        .map((item) => (typeof item === "string" ? normalizeCategory(item) : ""))
        .filter((item) => item && item !== "savings");

      setCustomExpenseCategories(Array.from(new Set(cleaned)).sort());
    } catch {
      // Ignore invalid local storage value.
    }
  }, []);

  function saveCustomCategories(categories: string[]) {
    const cleaned = Array.from(new Set(categories.map((item) => normalizeCategory(item)).filter((item) => item && item !== "savings"))).sort();
    setCustomExpenseCategories(cleaned);
    window.localStorage.setItem(CUSTOM_EXPENSE_CATEGORIES_KEY, JSON.stringify(cleaned));
  }

  function resetEntryFields(nextType: EntryType) {
    if (nextType === "income") {
      setCashTips("0");
      setCardTips("0");
      setHoursWorked("0");
    } else {
      setAmount("0");
      setCategory("food");
    }
    setNote("");
  }

  async function onEntrySubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSavingEntry(true);
    setError("");

    try {
      if (entryType === "income") {
        const res = await fetch("/api/income", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            shift_date: entryDate,
            cash_tips: cashTips,
            card_tips: cardTips,
            hours_worked: hoursWorked,
            note,
          }),
        });

        if (!res.ok) {
          const json = (await res.json().catch(() => ({}))) as { error?: string };
          setError(json.error ?? "Failed to save income entry.");
          return;
        }

        setCashTips("0");
        setCardTips("0");
        setHoursWorked("0");
        setNote("");
        void load();
        return;
      }

      const parsedAmount = Math.max(0, Number(amount) || 0);
      if (parsedAmount <= 0) {
        setError(entryType === "savings" ? "Enter a savings amount greater than 0." : "Enter an expense amount greater than 0.");
        return;
      }

      const normalizedCategory = entryType === "savings" ? "savings" : normalizeCategory(category);
      if (entryType === "expense" && !normalizedCategory) {
        setError("Category is required for expenses.");
        return;
      }

      const res = await fetch("/api/expenses", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          expense_date: entryDate,
          category: normalizedCategory,
          amount: parsedAmount,
          note,
        }),
      });

      if (!res.ok) {
        const json = (await res.json().catch(() => ({}))) as { error?: string };
        setError(json.error ?? "Failed to save entry.");
        return;
      }

      if (entryType === "expense" && normalizedCategory && !expenseCategoryOptions.includes(normalizedCategory)) {
        saveCustomCategories([...customExpenseCategories, normalizedCategory]);
      }

      setAmount("0");
      setNote("");
      void load();
    } finally {
      setSavingEntry(false);
    }
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

  function selectType(type: EntryType) {
    setEntryType(type);
    resetEntryFields(type);
  }

  return (
    <main style={{ display: "grid", gap: 14 }}>
      <section style={{ border: "1px solid var(--line)", borderRadius: 12, background: "var(--surface)", padding: 14 }}>
        <h1 style={{ marginTop: 0, marginBottom: 6 }}>Ledger</h1>
        <p style={{ margin: 0, color: "var(--muted)" }}>Track all monthly income, expenses, and savings in one place.</p>
      </section>

      {error ? <section style={{ color: "var(--danger)" }}>{error}</section> : null}

      <section style={{ border: "1px solid var(--line)", borderRadius: 12, background: "var(--surface)", padding: 14, display: "grid", gap: 10 }}>
        <h2 style={{ margin: 0 }}>Add Entry</h2>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={() => selectType("income")}
            style={{
              border: entryType === "income" ? "1px solid rgba(255, 216, 77, 0.9)" : "1px solid var(--line)",
              borderRadius: 999,
              padding: "8px 12px",
              background: entryType === "income" ? "rgba(255, 216, 77, 0.16)" : "var(--surface-2)",
              color: "var(--text)",
            }}
          >
            Income
          </button>
          <button
            type="button"
            onClick={() => selectType("expense")}
            style={{
              border: entryType === "expense" ? "1px solid rgba(255, 216, 77, 0.9)" : "1px solid var(--line)",
              borderRadius: 999,
              padding: "8px 12px",
              background: entryType === "expense" ? "rgba(255, 216, 77, 0.16)" : "var(--surface-2)",
              color: "var(--text)",
            }}
          >
            Expense
          </button>
          <button
            type="button"
            onClick={() => selectType("savings")}
            style={{
              border: entryType === "savings" ? "1px solid rgba(255, 216, 77, 0.9)" : "1px solid var(--line)",
              borderRadius: 999,
              padding: "8px 12px",
              background: entryType === "savings" ? "rgba(255, 216, 77, 0.16)" : "var(--surface-2)",
              color: "var(--text)",
            }}
          >
            Savings
          </button>
        </div>

        <form onSubmit={onEntrySubmit} style={{ display: "grid", gap: 10 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 8 }}>
            <input
              type="date"
              value={entryDate}
              onChange={(e) => setEntryDate(e.target.value)}
              required
              style={{ padding: 10, borderRadius: 8, border: "1px solid var(--line)", background: "var(--surface-2)", color: "var(--text)" }}
            />

            {entryType === "income" ? (
              <>
                <input type="number" step="0.01" min="0" placeholder="Cash tips" value={cashTips} onChange={(e) => setCashTips(e.target.value)} style={{ padding: 10, borderRadius: 8, border: "1px solid var(--line)", background: "var(--surface-2)", color: "var(--text)" }} />
                <input type="number" step="0.01" min="0" placeholder="Card tips" value={cardTips} onChange={(e) => setCardTips(e.target.value)} style={{ padding: 10, borderRadius: 8, border: "1px solid var(--line)", background: "var(--surface-2)", color: "var(--text)" }} />
                <input type="number" step="0.25" min="0" placeholder="Hours worked" value={hoursWorked} onChange={(e) => setHoursWorked(e.target.value)} style={{ padding: 10, borderRadius: 8, border: "1px solid var(--line)", background: "var(--surface-2)", color: "var(--text)" }} />
              </>
            ) : (
              <>
                {entryType === "expense" ? (
                  <>
                    <input
                      list="expense-category-options"
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      placeholder="Category"
                      style={{ padding: 10, borderRadius: 8, border: "1px solid var(--line)", background: "var(--surface-2)", color: "var(--text)" }}
                    />
                    <datalist id="expense-category-options">
                      {expenseCategoryOptions.map((item) => (
                        <option key={item} value={item} />
                      ))}
                    </datalist>
                  </>
                ) : (
                  <input value="savings" readOnly style={{ padding: 10, borderRadius: 8, border: "1px solid var(--line)", background: "#1a2335", color: "var(--muted)" }} />
                )}
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder={entryType === "savings" ? "Savings amount" : "Expense amount"}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  style={{ padding: 10, borderRadius: 8, border: "1px solid var(--line)", background: "var(--surface-2)", color: "var(--text)" }}
                />
              </>
            )}
          </div>

          <textarea
            placeholder="Note (optional)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            style={{ padding: 10, borderRadius: 8, border: "1px solid var(--line)", background: "var(--surface-2)", color: "var(--text)" }}
          />

          <div>
            <button type="submit" disabled={savingEntry} style={{ border: "none", borderRadius: 8, padding: "10px 14px", background: "var(--neon)", color: "#111", fontWeight: 800 }}>
              {savingEntry ? "Saving..." : entryType === "income" ? "Save Income" : entryType === "expense" ? "Save Expense" : "Save Savings"}
            </button>
          </div>
        </form>
      </section>

      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 12 }}>
        <article style={{ border: "1px solid var(--line)", borderRadius: 12, background: "var(--surface)", padding: 14 }}>
          <h2 style={{ marginTop: 0 }}>This Month&apos;s Income</h2>
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
          <h2 style={{ marginTop: 0 }}>This Month&apos;s Expenses + Savings</h2>
          {loading ? <p style={{ color: "var(--muted)" }}>Loading...</p> : null}
          {!loading && expenseRows.length === 0 ? <p style={{ color: "var(--muted)" }}>No expense or savings entries yet.</p> : null}
          {!loading && expenseRows.length > 0 ? (
            <div style={{ display: "grid", gap: 8 }}>
              {expenseRows.map((row) => (
                <article key={row.id} style={{ border: "1px solid var(--line)", borderRadius: 10, padding: 10, background: "var(--surface-2)", display: "grid", gap: 4 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                    <strong>{row.expense_date}</strong>
                    <span>{money(Number(row.amount))}</span>
                  </div>
                  <div style={{ color: "var(--muted)", fontSize: 13 }}>
                    Category: {categoryLabel(row.category)}
                    {normalizeCategory(row.category) === "savings" ? " (Savings Log)" : ""}
                  </div>
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
