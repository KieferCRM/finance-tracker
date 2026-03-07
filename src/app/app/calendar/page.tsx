"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { isDayOffEntry } from "@/lib/calendar";

const TODAY = new Date().toISOString().slice(0, 10);
const CURRENT_MONTH = TODAY.slice(0, 7);
const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const ONBOARDING_DISMISSED_KEY = "tiptab_onboarding_dismissed_v1";

type IncomeRow = {
  id: string;
  shift_date: string;
  cash_tips: number;
  card_tips: number;
  hours_worked: number;
  note: string | null;
};

type MonthReport = {
  totalIncome: number;
  totalHours: number;
};

type IncomeResponse = {
  rows: IncomeRow[];
};

type MonthlyReportResponse = {
  report: MonthReport;
};

type CalendarData = {
  rows: IncomeRow[];
  currentReport: MonthReport;
  previousReport: MonthReport;
};

function money(value: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value || 0);
}

function dayCellDate(month: string, day: number): string {
  return `${month}-${String(day).padStart(2, "0")}`;
}

function normalizeMonth(value: string): string {
  return /^\d{4}-\d{2}$/.test(value) ? value : CURRENT_MONTH;
}

function previousMonth(month: string): string {
  const normalized = normalizeMonth(month);
  const [yearStr, monthStr] = normalized.split("-");
  const date = new Date(Date.UTC(Number(yearStr), Number(monthStr) - 1, 1));
  date.setUTCMonth(date.getUTCMonth() - 1);
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(month: string): string {
  const normalized = normalizeMonth(month);
  const [yearStr, monthStr] = normalized.split("-");
  const date = new Date(Date.UTC(Number(yearStr), Number(monthStr) - 1, 1));
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

async function fetchCalendarData(month: string): Promise<CalendarData> {
  const normalizedMonth = normalizeMonth(month);
  const previous = previousMonth(normalizedMonth);

  const [incomeRes, currentReportRes, previousReportRes] = await Promise.all([
    fetch(`/api/income?month=${normalizedMonth}&limit=5000&include_day_off=true`),
    fetch(`/api/report/monthly?month=${normalizedMonth}`),
    fetch(`/api/report/monthly?month=${previous}`),
  ]);

  if (!incomeRes.ok || !currentReportRes.ok || !previousReportRes.ok) {
    throw new Error("Failed to load calendar data.");
  }

  const [incomeJson, currentReportJson, previousReportJson] = (await Promise.all([
    incomeRes.json(),
    currentReportRes.json(),
    previousReportRes.json(),
  ])) as [IncomeResponse, MonthlyReportResponse, MonthlyReportResponse];

  return {
    rows: incomeJson.rows ?? [],
    currentReport: currentReportJson.report ?? { totalIncome: 0, totalHours: 0 },
    previousReport: previousReportJson.report ?? { totalIncome: 0, totalHours: 0 },
  };
}

export default function CalendarPage() {
  const [month, setMonth] = useState(CURRENT_MONTH);
  const [expandedDate, setExpandedDate] = useState<string | null>(null);
  const [incomeRows, setIncomeRows] = useState<IncomeRow[]>([]);
  const [currentReport, setCurrentReport] = useState<MonthReport | null>(null);
  const [lastMonthReport, setLastMonthReport] = useState<MonthReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [showOnboarding, setShowOnboarding] = useState(false);

  const [cashTips, setCashTips] = useState("");
  const [cardTips, setCardTips] = useState("");
  const [hoursWorked, setHoursWorked] = useState("");
  const [note, setNote] = useState("");

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError("");

      try {
        const data = await fetchCalendarData(month);
        if (!active) return;

        setIncomeRows(data.rows);
        setCurrentReport(data.currentReport);
        setLastMonthReport(data.previousReport);
      } catch {
        if (!active) return;
        setError("Failed to load calendar data.");
      } finally {
        if (active) setLoading(false);
      }
    }

    void load();
    return () => {
      active = false;
    };
  }, [month]);

  useEffect(() => {
    if (expandedDate && !expandedDate.startsWith(month)) {
      setExpandedDate(null);
    }
  }, [month, expandedDate]);

  useEffect(() => {
    const dismissed = window.localStorage.getItem(ONBOARDING_DISMISSED_KEY) === "true";
    setShowOnboarding(!dismissed);
  }, []);

  const dailyTotals = useMemo(() => {
    const totals = new Map<string, { tips: number; hours: number; count: number }>();
    for (const row of incomeRows) {
      if (isDayOffEntry(row)) continue;
      const current = totals.get(row.shift_date) ?? { tips: 0, hours: 0, count: 0 };
      totals.set(row.shift_date, {
        tips: current.tips + Number(row.cash_tips) + Number(row.card_tips),
        hours: current.hours + Number(row.hours_worked),
        count: current.count + 1,
      });
    }
    return totals;
  }, [incomeRows]);

  const computedMonthSummary = useMemo(() => {
    const earnings = incomeRows.reduce((sum, row) => (isDayOffEntry(row) ? sum : sum + Number(row.cash_tips) + Number(row.card_tips)), 0);
    const hours = incomeRows.reduce((sum, row) => (isDayOffEntry(row) ? sum : sum + Number(row.hours_worked)), 0);
    return { earnings, hours };
  }, [incomeRows]);

  const dayOffDates = useMemo(() => {
    const dates = new Set<string>();
    for (const row of incomeRows) {
      if (isDayOffEntry(row)) dates.add(row.shift_date);
    }
    return dates;
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

  async function refreshAfterSave() {
    const latest = await fetchCalendarData(month);
    setIncomeRows(latest.rows);
    setCurrentReport(latest.currentReport);
    setLastMonthReport(latest.previousReport);
  }

  async function saveShift(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!expandedDate) return;

    setSaving(true);
    setError("");

    try {
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
        return;
      }

      setCashTips("");
      setCardTips("");
      setHoursWorked("");
      setNote("");
      setExpandedDate(null);

      void refreshAfterSave().catch(() => {
        setError("Shift saved, but failed to refresh totals. Refresh the page.");
      });
    } catch {
      setError("Failed to save shift.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleDayOff() {
    if (!expandedDate) return;

    const offRows = incomeRows.filter((row) => row.shift_date === expandedDate && isDayOffEntry(row));
    setSaving(true);
    setError("");

    try {
      if (offRows.length > 0) {
        const results = await Promise.all(
          offRows.map((row) => fetch(`/api/income/${row.id}`, { method: "DELETE" }))
        );

        if (results.some((res) => !res.ok)) {
          setError("Failed to unmark day off.");
          return;
        }
      } else {
        const res = await fetch("/api/income", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            shift_date: expandedDate,
            cash_tips: 0,
            card_tips: 0,
            hours_worked: 0,
            day_off: true,
          }),
        });
        if (!res.ok) {
          const json = (await res.json().catch(() => ({}))) as { error?: string };
          setError(json.error ?? "Failed to mark day off.");
          return;
        }
      }

      setExpandedDate(null);
      void refreshAfterSave().catch(() => {
        setError("Day off saved, but failed to refresh calendar. Refresh the page.");
      });
    } catch {
      setError("Failed to update day off.");
    } finally {
      setSaving(false);
    }
  }

  const expandedTotals = expandedDate
    ? dailyTotals.get(expandedDate) ?? { tips: 0, hours: 0, count: 0 }
    : { tips: 0, hours: 0, count: 0 };

  const expandedDayOffRows = expandedDate
    ? incomeRows.filter((row) => row.shift_date === expandedDate && isDayOffEntry(row))
    : [];
  const isExpandedDayOff = expandedDayOffRows.length > 0;
  const expandedRows = expandedDate
    ? incomeRows.filter((row) => row.shift_date === expandedDate && !isDayOffEntry(row))
    : [];
  const expandedDay = expandedDate ? Number(expandedDate.slice(8, 10)) : null;
  const monthTitle = monthLabel(month);
  const previousMonthValue = previousMonth(month);
  const previousMonthTitle = monthLabel(previousMonthValue);

  const currentMonthEarnings = currentReport?.totalIncome ?? computedMonthSummary.earnings;
  const currentMonthHours = currentReport?.totalHours ?? computedMonthSummary.hours;

  function dismissOnboarding() {
    setShowOnboarding(false);
    window.localStorage.setItem(ONBOARDING_DISMISSED_KEY, "true");
  }

  return (
    <main style={{ display: "grid", gap: 14 }}>
      <section style={{ border: "1px solid var(--line)", borderRadius: 12, background: "var(--surface)", padding: 14, display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
        <div>
          <h1 style={{ margin: "0 0 6px" }}>Shift Calendar</h1>
          <div style={{ color: "var(--muted)" }}>Click a date to add tips + hours for that shift.</div>
        </div>
        <input
          type="month"
          value={month}
          onChange={(e) => setMonth(normalizeMonth(e.target.value))}
          style={{ padding: 10, borderRadius: 8, border: "1px solid var(--line)", background: "var(--surface-2)", color: "var(--text)" }}
        />
      </section>

      {showOnboarding ? (
        <section style={{ border: "1px solid var(--line)", borderRadius: 12, background: "#132119", padding: 12, display: "grid", gap: 8 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
            <strong>Quick Start</strong>
            <button
              type="button"
              onClick={dismissOnboarding}
              style={{ border: "1px solid var(--line)", borderRadius: 8, background: "transparent", color: "var(--text)", padding: "5px 8px" }}
            >
              Dismiss
            </button>
          </div>
          <div style={{ color: "var(--muted)", fontSize: 14 }}>
            Tap a date to log your shift, mark off-days, and keep monthly totals accurate.
          </div>
          <ul style={{ margin: 0, paddingLeft: 18, display: "grid", gap: 6, color: "var(--muted)", fontSize: 13 }}>
            <li>Use “Mark Day Off” when you are not working.</li>
            <li>Log cash tips, card tips, and hours after each shift.</li>
            <li>Check report page monthly and export a CSV backup.</li>
          </ul>
        </section>
      ) : null}

      {error ? <section style={{ color: "var(--danger)" }}>{error}</section> : null}

      <section style={{ border: "1px solid var(--line)", borderRadius: 12, background: "var(--surface)", padding: 12, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
        <article style={{ border: "1px solid var(--line)", borderRadius: 10, background: "var(--surface-2)", padding: 12 }}>
          <div style={{ color: "var(--muted)", fontSize: 12 }}>{monthTitle} Earnings</div>
          <div style={{ fontSize: 24, fontWeight: 800 }}>{money(currentMonthEarnings)}</div>
        </article>

        <article style={{ border: "1px solid var(--line)", borderRadius: 10, background: "var(--surface-2)", padding: 12 }}>
          <div style={{ color: "var(--muted)", fontSize: 12 }}>{monthTitle} Hours Worked</div>
          <div style={{ fontSize: 24, fontWeight: 800 }}>{currentMonthHours.toFixed(1)} hrs</div>
        </article>

        <article style={{ border: "1px solid var(--line)", borderRadius: 10, background: "#141c26", padding: 12, display: "grid", gap: 6 }}>
          <div style={{ color: "var(--muted)", fontSize: 12 }}>{previousMonthTitle} Snapshot</div>
          <div style={{ fontWeight: 700 }}>Earnings: {money(lastMonthReport?.totalIncome ?? 0)}</div>
          <div style={{ color: "var(--muted)" }}>Hours: {(lastMonthReport?.totalHours ?? 0).toFixed(1)} hrs</div>
        </article>
      </section>

      {loading ? (
        <section style={{ color: "var(--muted)" }}>Loading calendar...</section>
      ) : !expandedDate ? (
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
              const isToday = cell.date === TODAY;
              const isDayOff = dayOffDates.has(cell.date) && !totals;

              return (
                <button
                  key={cell.date}
                  type="button"
                  onClick={() => setExpandedDate(cell.date)}
                  aria-label={`Open ${cell.date}`}
                  style={{
                    border: isToday ? "1px solid var(--neon)" : "1px solid var(--line)",
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
                  {isDayOff ? <span style={{ color: "var(--amber)", fontSize: 12, fontWeight: 700 }}>Day Off</span> : null}
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
                type="button"
                onClick={() => setExpandedDate(null)}
                style={{ border: "1px solid var(--line)", borderRadius: 8, background: "var(--surface-2)", color: "var(--text)", padding: "6px 10px" }}
              >
                Back To Calendar
              </button>
            </div>

            <div style={{ color: "var(--muted)", fontSize: 14 }}>
              {expandedDate} • Tips {money(expandedTotals.tips)} • Hours {expandedTotals.hours.toFixed(1)}
            </div>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button
                type="button"
                disabled={saving}
                onClick={() => void toggleDayOff()}
                style={{
                  border: "1px solid var(--line)",
                  borderRadius: 8,
                  padding: "8px 12px",
                  background: isExpandedDayOff ? "#35261c" : "var(--surface-2)",
                  color: "var(--text)",
                  fontWeight: 700,
                }}
              >
                {isExpandedDayOff ? "Unmark Day Off" : "Mark Day Off"}
              </button>
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
                  disabled={saving}
                  style={{ border: "none", borderRadius: 8, padding: "10px 14px", background: "var(--neon)", color: "#111", fontWeight: 800 }}
                >
                  {saving ? "Saving..." : "Save Shift"}
                </button>
              </div>

              <div style={{ color: "var(--muted)", fontSize: 12 }}>At least one field (tips or hours) must be greater than 0.</div>

              <div style={{ display: "grid", gap: 6 }}>
                <label htmlFor="shift-note" style={{ color: "var(--muted)", fontSize: 12 }}>
                  Notes
                </label>
                <textarea
                  id="shift-note"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Shift notes (optional)"
                  rows={3}
                  maxLength={500}
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
