"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

const TODAY = new Date().toISOString().slice(0, 10);
const CURRENT_MONTH = TODAY.slice(0, 7);
const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

type IncomeRow = {
  id: string;
  shift_date: string;
  cash_tips: number;
  card_tips: number;
  hours_worked: number;
  note: string | null;
};

function money(value: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value || 0);
}

function dayCellDate(month: string, day: number): string {
  return `${month}-${String(day).padStart(2, "0")}`;
}

export default function CalendarPage() {
  const [month, setMonth] = useState(CURRENT_MONTH);
  const [expandedDate, setExpandedDate] = useState<string | null>(null);
  const [incomeRows, setIncomeRows] = useState<IncomeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [cashTips, setCashTips] = useState("");
  const [cardTips, setCardTips] = useState("");
  const [hoursWorked, setHoursWorked] = useState("");
  const [note, setNote] = useState("");

  useEffect(() => {
    let active = true;

    async function loadMonth() {
      setLoading(true);
      setError("");
      const res = await fetch(`/api/income?month=${month}&limit=300`);
      if (!active) return;
      if (!res.ok) {
        setError("Failed to load month data.");
        setLoading(false);
        return;
      }
      const json = (await res.json()) as { rows: IncomeRow[] };
      if (!active) return;
      setIncomeRows(json.rows ?? []);
      setLoading(false);
    }

    void loadMonth();
    return () => {
      active = false;
    };
  }, [month]);

  useEffect(() => {
    if (expandedDate && !expandedDate.startsWith(month)) {
      setExpandedDate(null);
    }
  }, [month, expandedDate]);

  const dailyTotals = useMemo(() => {
    const totals = new Map<string, { tips: number; hours: number; count: number }>();
    for (const row of incomeRows) {
      const date = row.shift_date;
      const current = totals.get(date) ?? { tips: 0, hours: 0, count: 0 };
      totals.set(date, {
        tips: current.tips + Number(row.cash_tips) + Number(row.card_tips),
        hours: current.hours + Number(row.hours_worked),
        count: current.count + 1,
      });
    }
    return totals;
  }, [incomeRows]);

  const monthSummary = useMemo(() => {
    const earnings = incomeRows.reduce((sum, row) => sum + Number(row.cash_tips) + Number(row.card_tips), 0);
    const hours = incomeRows.reduce((sum, row) => sum + Number(row.hours_worked), 0);
    const perHour = hours > 0 ? earnings / hours : 0;
    return { earnings, hours, perHour };
  }, [incomeRows]);

  const monthGrid = useMemo(() => {
    const [yearStr, monthStr] = month.split("-");
    const year = Number(yearStr);
    const monthIndex = Number(monthStr) - 1;
    const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
    const firstDay = new Date(Date.UTC(year, monthIndex, 1)).getUTCDay();
    const mondayFirstOffset = firstDay === 0 ? 6 : firstDay - 1;

    const cells: Array<{ day: number; date: string } | null> = [];
    for (let i = 0; i < mondayFirstOffset; i += 1) cells.push(null);
    for (let day = 1; day <= daysInMonth; day += 1) {
      cells.push({ day, date: dayCellDate(month, day) });
    }
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [month]);

  async function saveShift(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!expandedDate) return;
    setSaving(true);
    setError("");

    const res = await fetch("/api/income", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        shift_date: expandedDate,
        cash_tips: cashTips,
        card_tips: cardTips,
        hours_worked: hoursWorked,
        note,
      }),
    });

    if (!res.ok) {
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      setError(json.error ?? "Failed to save shift.");
      setSaving(false);
      return;
    }

    const latest = await fetch(`/api/income?month=${month}&limit=300`);
    if (latest.ok) {
      const json = (await latest.json()) as { rows: IncomeRow[] };
      setIncomeRows(json.rows ?? []);
    }

    setCashTips("");
    setCardTips("");
    setHoursWorked("");
    setNote("");
    setSaving(false);
  }

  const expandedTotals = expandedDate
    ? dailyTotals.get(expandedDate) ?? { tips: 0, hours: 0, count: 0 }
    : { tips: 0, hours: 0, count: 0 };

  const expandedRows = expandedDate ? incomeRows.filter((row) => row.shift_date === expandedDate) : [];
  const expandedDay = expandedDate ? Number(expandedDate.slice(8, 10)) : null;

  return (
    <main style={{ display: "grid", gap: 14 }}>
      <section style={{ border: "1px solid var(--line)", borderRadius: 12, background: "var(--surface)", padding: 14, display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
        <div>
          <h1 style={{ margin: "0 0 6px" }}>Calendar Log</h1>
          <div style={{ color: "var(--muted)" }}>Tap a day and log tips + hours in one quick flow.</div>
        </div>
        <input
          type="month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          style={{ padding: 10, borderRadius: 8, border: "1px solid var(--line)", background: "var(--surface-2)", color: "var(--text)" }}
        />
      </section>

      {error ? <section style={{ color: "var(--danger)" }}>{error}</section> : null}

      <section style={{ border: "1px solid var(--line)", borderRadius: 12, background: "var(--surface)", padding: 12, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
        <article style={{ border: "1px solid var(--line)", borderRadius: 10, background: "var(--surface-2)", padding: 10 }}>
          <div style={{ color: "var(--muted)", fontSize: 12 }}>Month Earnings</div>
          <div style={{ fontSize: 22, fontWeight: 800 }}>{money(monthSummary.earnings)}</div>
        </article>
        <article style={{ border: "1px solid var(--line)", borderRadius: 10, background: "var(--surface-2)", padding: 10 }}>
          <div style={{ color: "var(--muted)", fontSize: 12 }}>Made Per Hour</div>
          <div style={{ fontSize: 22, fontWeight: 800 }}>
            {monthSummary.hours > 0 ? `${money(monthSummary.perHour)}/hr` : "--"}
          </div>
        </article>
      </section>

      {!expandedDate ? (
        <section style={{ border: "1px solid var(--line)", borderRadius: 12, background: "var(--surface)", padding: 14, display: "grid", gap: 8 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))", gap: 6 }}>
            {WEEKDAY_LABELS.map((label) => (
              <div key={label} style={{ color: "var(--muted)", fontSize: 12, textAlign: "center" }}>
                {label}
              </div>
            ))}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))", gap: 6 }}>
            {monthGrid.map((cell, index) => {
              if (!cell) return <div key={`blank-${index}`} />;
              const totals = dailyTotals.get(cell.date);
              return (
                <button
                  key={cell.date}
                  onClick={() => setExpandedDate(cell.date)}
                  style={{
                    border: "1px solid var(--line)",
                    borderRadius: 10,
                    background: "var(--surface-2)",
                    color: "var(--text)",
                    minHeight: 118,
                    padding: 8,
                    textAlign: "left",
                    display: "grid",
                    gap: 4,
                    cursor: "pointer",
                  }}
                >
                  <strong>{cell.day}</strong>
                  <span style={{ color: "var(--muted)", fontSize: 12 }}>
                    Tips: {totals ? money(totals.tips) : "--"}
                  </span>
                  <span style={{ color: "var(--muted)", fontSize: 12 }}>
                    Hrs: {totals ? totals.hours.toFixed(1) : "--"}
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      ) : (
        <section
          onClick={() => setExpandedDate(null)}
          style={{
            border: "1px solid var(--line)",
            borderRadius: 12,
            background: "var(--surface)",
            padding: 10,
            minHeight: "72vh",
            display: "grid",
          }}
        >
          <article
            onClick={(e) => e.stopPropagation()}
            style={{
              border: "1px solid var(--neon)",
              borderRadius: 14,
              background: "#11161d",
              padding: 14,
              display: "grid",
              gap: 12,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
              <h2 style={{ margin: 0 }}>Day {expandedDay}</h2>
              <button
                onClick={() => setExpandedDate(null)}
                style={{ border: "1px solid var(--line)", borderRadius: 8, background: "var(--surface-2)", color: "var(--text)", padding: "6px 10px" }}
              >
                Back To Calendar
              </button>
            </div>

            <div style={{ color: "var(--muted)", fontSize: 14 }}>
              {expandedDate} • Tips {money(expandedTotals.tips)} • Hours {expandedTotals.hours.toFixed(1)}
            </div>

            <form onSubmit={saveShift} style={{ display: "grid", gap: 8 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={cashTips}
                  onChange={(e) => setCashTips(e.target.value)}
                  placeholder="Cash Tips"
                  style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid #425264", background: "#0e1319", color: "var(--text)" }}
                />
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={cardTips}
                  onChange={(e) => setCardTips(e.target.value)}
                  placeholder="Card Tips"
                  style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid #425264", background: "#0e1319", color: "var(--text)" }}
                />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 8 }}>
                <input
                  type="number"
                  step="0.25"
                  min="0"
                  value={hoursWorked}
                  onChange={(e) => setHoursWorked(e.target.value)}
                  placeholder="Hours Worked"
                  style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid #425264", background: "#0e1319", color: "var(--text)" }}
                />
                <button
                  type="submit"
                  disabled={saving || loading}
                  style={{ border: "none", borderRadius: 8, padding: "10px 14px", background: "var(--neon)", color: "#111", fontWeight: 800 }}
                >
                  {saving ? "Saving..." : "Save Shift"}
                </button>
              </div>
              <div style={{ display: "grid", gap: 6 }}>
                <label style={{ color: "var(--muted)", fontSize: 12 }}>Notes</label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Shift notes (optional)"
                  rows={3}
                  style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid #425264", background: "#0e1319", color: "var(--text)", resize: "vertical" }}
                />
              </div>
            </form>

            <div style={{ display: "grid", gap: 8 }}>
              <strong>Entries</strong>
              {expandedRows.length === 0 ? (
                <div style={{ color: "var(--muted)" }}>No entries for this day yet.</div>
              ) : (
                <ul style={{ margin: 0, paddingLeft: 18, display: "grid", gap: 6 }}>
                  {expandedRows.map((row) => (
                    <li key={row.id}>
                      {money(Number(row.cash_tips) + Number(row.card_tips))} • {Number(row.hours_worked).toFixed(1)} hrs
                      {row.note ? ` • ${row.note}` : ""}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </article>
        </section>
      )}
    </main>
  );
}
