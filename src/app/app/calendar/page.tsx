"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { isDayOffEntry } from "@/lib/calendar";

const TODAY = new Date().toISOString().slice(0, 10);
const CURRENT_MONTH = TODAY.slice(0, 7);
const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
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

type ScheduleEventRow = {
  id: string;
  title: string;
  location: string | null;
  notes: string | null;
  shift_date: string;
  start_time: string;
  end_time: string;
  all_day: boolean;
  source_name: string | null;
};

type ScheduleResponse = {
  rows?: ScheduleEventRow[];
};

type CalendarData = {
  rows: IncomeRow[];
  currentReport: MonthReport;
  previousReport: MonthReport;
  scheduleRows: ScheduleEventRow[];
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

function nextMonth(month: string): string {
  const normalized = normalizeMonth(month);
  const [yearStr, monthStr] = normalized.split("-");
  const date = new Date(Date.UTC(Number(yearStr), Number(monthStr) - 1, 1));
  date.setUTCMonth(date.getUTCMonth() + 1);
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

function dayLabel(isoDate: string): string {
  const date = new Date(`${isoDate}T00:00:00`);
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(date);
}

function scheduleTimeLabel(row: ScheduleEventRow): string {
  if (row.all_day || !row.start_time) return "All day";
  if (row.end_time) return `${row.start_time} - ${row.end_time}`;
  return row.start_time;
}

async function fetchScheduleRows(month: string): Promise<ScheduleEventRow[]> {
  try {
    const res = await fetch(`/api/schedule/events?month=${month}`);
    if (!res.ok) return [];
    const json = (await res.json().catch(() => ({}))) as ScheduleResponse;
    return json.rows ?? [];
  } catch {
    return [];
  }
}

async function fetchCalendarData(month: string): Promise<CalendarData> {
  const normalizedMonth = normalizeMonth(month);
  const previous = previousMonth(normalizedMonth);

  const [incomeRes, currentReportRes, previousReportRes, scheduleRows] = await Promise.all([
    fetch(`/api/income?month=${normalizedMonth}&limit=5000&include_day_off=true`),
    fetch(`/api/report/monthly?month=${normalizedMonth}`),
    fetch(`/api/report/monthly?month=${previous}`),
    fetchScheduleRows(normalizedMonth),
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
    scheduleRows,
  };
}

export default function CalendarPage() {
  const [month, setMonth] = useState(CURRENT_MONTH);
  const [expandedDate, setExpandedDate] = useState<string | null>(null);
  const [incomeRows, setIncomeRows] = useState<IncomeRow[]>([]);
  const [scheduleRows, setScheduleRows] = useState<ScheduleEventRow[]>([]);
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
        setScheduleRows(data.scheduleRows);
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

  const scheduleByDate = useMemo(() => {
    const rowsByDate = new Map<string, ScheduleEventRow[]>();
    for (const row of scheduleRows) {
      const current = rowsByDate.get(row.shift_date) ?? [];
      current.push(row);
      rowsByDate.set(row.shift_date, current);
    }

    for (const rows of rowsByDate.values()) {
      rows.sort((a, b) => a.start_time.localeCompare(b.start_time));
    }

    return rowsByDate;
  }, [scheduleRows]);

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

    const cells: Array<{ day: number; date: string } | null> = [];
    for (let i = 0; i < firstDay; i += 1) cells.push(null);
    for (let day = 1; day <= daysInMonth; day += 1) {
      cells.push({ day, date: dayCellDate(month, day) });
    }
    while (cells.length % 7 !== 0) cells.push(null);

    return cells;
  }, [month]);

  async function refreshAfterSave() {
    const latest = await fetchCalendarData(month);
    setIncomeRows(latest.rows);
    setScheduleRows(latest.scheduleRows);
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
        const results = await Promise.all(offRows.map((row) => fetch(`/api/income/${row.id}`, { method: "DELETE" })));

        if (results.some((res) => !res.ok)) {
          setError("Failed to clear off day.");
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
          setError(json.error ?? "Failed to set off day.");
          return;
        }
      }

      setExpandedDate(null);
      void refreshAfterSave().catch(() => {
        setError("Off day saved, but failed to refresh calendar. Refresh the page.");
      });
    } catch {
      setError("Failed to update off day.");
    } finally {
      setSaving(false);
    }
  }

  const expandedTotals = expandedDate
    ? dailyTotals.get(expandedDate) ?? { tips: 0, hours: 0, count: 0 }
    : { tips: 0, hours: 0, count: 0 };

  const expandedRows = expandedDate
    ? incomeRows.filter((row) => row.shift_date === expandedDate && !isDayOffEntry(row))
    : [];
  const expandedScheduleRows = expandedDate ? scheduleByDate.get(expandedDate) ?? [] : [];
  const expandedDayOffRows = expandedDate
    ? incomeRows.filter((row) => row.shift_date === expandedDate && isDayOffEntry(row))
    : [];
  const isExpandedDayOff = expandedDayOffRows.length > 0;

  const monthTitle = monthLabel(month);
  const previousMonthValue = previousMonth(month);
  const previousMonthTitle = monthLabel(previousMonthValue);

  const currentMonthEarnings = currentReport?.totalIncome ?? computedMonthSummary.earnings;
  const currentMonthHours = currentReport?.totalHours ?? computedMonthSummary.hours;
  const takeHomePerHour = currentMonthHours > 0 ? currentMonthEarnings / currentMonthHours : 0;

  function dismissOnboarding() {
    setShowOnboarding(false);
    window.localStorage.setItem(ONBOARDING_DISMISSED_KEY, "true");
  }

  return (
    <main style={{ display: "grid", gap: 12 }}>
      <section
        style={{
          borderRadius: 14,
          padding: 14,
          background: "linear-gradient(145deg, #22b357 0%, #178745 100%)",
          color: "#f6fff8",
          display: "grid",
          gap: 8,
          border: "1px solid rgba(255,255,255,0.25)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
          <strong style={{ fontSize: 20 }}>Calendar</strong>
          <Link
            href="/app/schedule"
            style={{
              textDecoration: "none",
              borderRadius: 999,
              border: "1px solid rgba(255,255,255,0.5)",
              color: "#f6fff8",
              padding: "7px 12px",
              fontSize: 12,
              fontWeight: 700,
              background: "rgba(0,0,0,0.12)",
            }}
          >
            Sync Schedule
          </Link>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
          <button
            type="button"
            onClick={() => setMonth(previousMonth(month))}
            style={{ border: "1px solid rgba(255,255,255,0.45)", background: "rgba(0,0,0,0.12)", color: "#f6fff8", borderRadius: 10, padding: "8px 10px", minWidth: 44 }}
            aria-label="Previous month"
          >
            {"<"}
          </button>
          <div style={{ fontSize: 34, lineHeight: 1, fontWeight: 700, textAlign: "center" }}>{monthTitle}</div>
          <button
            type="button"
            onClick={() => setMonth(nextMonth(month))}
            style={{ border: "1px solid rgba(255,255,255,0.45)", background: "rgba(0,0,0,0.12)", color: "#f6fff8", borderRadius: 10, padding: "8px 10px", minWidth: 44 }}
            aria-label="Next month"
          >
            {">"}
          </button>
        </div>

        <input
          type="month"
          value={month}
          onChange={(e) => setMonth(normalizeMonth(e.target.value))}
          style={{ padding: 10, borderRadius: 10, border: "1px solid rgba(255,255,255,0.45)", background: "rgba(0,0,0,0.12)", color: "#f6fff8" }}
        />
      </section>

      <section
        style={{
          border: "1px solid var(--line)",
          borderRadius: 12,
          background: "var(--surface)",
          color: "var(--text)",
          padding: 10,
          display: "grid",
          gap: 10,
        }}
      >
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 8 }}>
          <article style={{ background: "var(--surface-2)", borderRadius: 10, padding: 8, border: "1px solid var(--line)" }}>
            <div style={{ fontSize: 11, color: "var(--muted)" }}>Take Home</div>
            <div style={{ fontWeight: 700 }}>{money(currentMonthEarnings)}</div>
          </article>
          <article style={{ background: "var(--surface-2)", borderRadius: 10, padding: 8, border: "1px solid var(--line)" }}>
            <div style={{ fontSize: 11, color: "var(--muted)" }}>Hours</div>
            <div style={{ fontWeight: 700 }}>{currentMonthHours.toFixed(2)}</div>
          </article>
          <article style={{ background: "var(--surface-2)", borderRadius: 10, padding: 8, border: "1px solid var(--line)" }}>
            <div style={{ fontSize: 11, color: "var(--muted)" }}>Take Home / Hour</div>
            <div style={{ fontWeight: 700 }}>{money(takeHomePerHour)}</div>
          </article>
        </div>

        <article style={{ background: "var(--surface-2)", borderRadius: 10, padding: 10, border: "1px solid var(--line)" }}>
          <div style={{ fontSize: 12, color: "var(--muted)" }}>{previousMonthTitle} Snapshot</div>
          <div style={{ fontWeight: 700 }}>Earnings: {money(lastMonthReport?.totalIncome ?? 0)}</div>
          <div style={{ fontSize: 13, color: "var(--muted)" }}>Hours: {(lastMonthReport?.totalHours ?? 0).toFixed(1)} hrs</div>
        </article>

        {showOnboarding ? (
          <article style={{ background: "var(--surface-2)", borderRadius: 10, padding: 10, border: "1px solid var(--line)", display: "grid", gap: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
              <strong>Quick Start</strong>
              <button
                type="button"
                onClick={dismissOnboarding}
                style={{ border: "1px solid var(--line)", borderRadius: 8, background: "var(--surface)", padding: "5px 8px", color: "var(--text)" }}
              >
                Dismiss
              </button>
            </div>
            <div style={{ color: "var(--muted)", fontSize: 13 }}>Tap a date to log tips/hours, set Off Day, and check synced shifts.</div>
          </article>
        ) : null}
      </section>

      {error ? <section style={{ color: "var(--danger)" }}>{error}</section> : null}

      {loading ? (
        <section style={{ color: "var(--muted)" }}>Loading calendar...</section>
      ) : (
        <section style={{ border: "1px solid var(--line)", borderRadius: 12, background: "var(--surface)", color: "var(--text)", overflow: "hidden" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))", background: "#189447", color: "#f5fff8" }}>
            {WEEKDAY_LABELS.map((label) => (
              <div key={label} style={{ textAlign: "center", fontSize: 12, padding: "7px 4px", fontWeight: 700 }}>
                {label}
              </div>
            ))}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))", gap: 1, background: "var(--line)" }}>
            {monthGrid.map((cell, index) => {
              if (!cell) return <div key={`blank-${index}`} style={{ minHeight: 88, background: "#141920" }} />;

              const totals = dailyTotals.get(cell.date);
              const scheduled = scheduleByDate.get(cell.date) ?? [];
              const isToday = cell.date === TODAY;
              const isDayOff = dayOffDates.has(cell.date) && !totals;
              const isActive = expandedDate === cell.date;

              return (
                <button
                  key={cell.date}
                  type="button"
                  onClick={() => setExpandedDate(cell.date)}
                  aria-label={`Open ${cell.date}`}
                  style={{
                    border: "none",
                    background: isActive ? "#1e2e22" : isDayOff ? "#1c2b21" : "var(--surface-2)",
                    color: "var(--text)",
                    minHeight: 88,
                    padding: 6,
                    textAlign: "left",
                    display: "grid",
                    alignContent: "space-between",
                    gap: 4,
                    cursor: "pointer",
                    boxShadow: isToday ? "inset 0 0 0 2px #2cc95f" : "none",
                  }}
                >
                  <div style={{ fontWeight: 700, fontSize: 20 }}>{cell.day}</div>
                  <div style={{ display: "grid", gap: 3 }}>
                    {totals ? <span style={{ fontSize: 11, color: "var(--text)" }}>{money(totals.tips)}</span> : null}
                    {totals ? <span style={{ fontSize: 11, color: "var(--muted)" }}>{totals.hours.toFixed(1)}h</span> : null}
                    {scheduled.length > 0 ? (
                      <span
                        style={{
                          fontSize: 10,
                          borderRadius: 999,
                          background: "#1a2230",
                          color: "#9ec5ff",
                          padding: "2px 6px",
                          width: "fit-content",
                          fontWeight: 700,
                        }}
                      >
                        {scheduled.length} shift{scheduled.length === 1 ? "" : "s"}
                      </span>
                    ) : null}
                    {isDayOff ? (
                      <span
                        style={{
                          fontSize: 10,
                          borderRadius: 999,
                          background: "#1f3828",
                          color: "#8ff0b5",
                          padding: "2px 6px",
                          width: "fit-content",
                          fontWeight: 700,
                        }}
                      >
                        Off Day
                      </span>
                    ) : null}
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {expandedDate ? (
        <section style={{ border: "1px solid var(--line)", borderRadius: 12, background: "var(--surface)", padding: 12, display: "grid", gap: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
            <strong style={{ fontSize: 18 }}>{dayLabel(expandedDate)}</strong>
            <button
              type="button"
              onClick={() => setExpandedDate(null)}
              style={{ border: "1px solid var(--line)", borderRadius: 8, background: "var(--surface-2)", color: "var(--text)", padding: "7px 10px" }}
            >
              Close
            </button>
          </div>

          <div style={{ color: "var(--muted)", fontSize: 14 }}>
            Logged: {money(expandedTotals.tips)} and {expandedTotals.hours.toFixed(1)} hrs
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button
              type="button"
              disabled={saving}
              onClick={() => void toggleDayOff()}
              style={{
                border: "1px solid var(--line)",
                borderRadius: 10,
                padding: "10px 12px",
                background: isExpandedDayOff ? "#2f2419" : "var(--surface-2)",
                color: "var(--text)",
                fontWeight: 700,
              }}
            >
              {isExpandedDayOff ? "Clear Off Day" : "Off Day"}
            </button>
            <Link
              href="/app/schedule"
              style={{
                textDecoration: "none",
                border: "1px solid var(--line)",
                borderRadius: 10,
                padding: "10px 12px",
                background: "#16202f",
                color: "var(--text)",
                fontWeight: 700,
              }}
            >
              Manage Schedule Sync
            </Link>
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
                style={{ padding: "12px 12px", borderRadius: 10, border: "1px solid #425264", background: "#0e1319", color: "var(--text)" }}
              />
              <input
                type="number"
                step="0.01"
                min="0"
                value={cardTips}
                onChange={(e) => setCardTips(e.target.value)}
                placeholder="Card Tips"
                style={{ padding: "12px 12px", borderRadius: 10, border: "1px solid #425264", background: "#0e1319", color: "var(--text)" }}
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
                style={{ padding: "12px 12px", borderRadius: 10, border: "1px solid #425264", background: "#0e1319", color: "var(--text)" }}
              />
              <button
                type="submit"
                disabled={saving}
                style={{ border: "none", borderRadius: 10, padding: "12px 16px", background: "#2cc95f", color: "#09200f", fontWeight: 800 }}
              >
                {saving ? "Saving..." : "Save"}
              </button>
            </div>

            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Notes (optional)"
              rows={3}
              maxLength={500}
              style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid #425264", background: "#0e1319", color: "var(--text)", resize: "vertical" }}
            />
          </form>

          <section style={{ display: "grid", gap: 6 }}>
            <strong>Scheduled Shifts</strong>
            {expandedScheduleRows.length === 0 ? (
              <div style={{ color: "var(--muted)", fontSize: 14 }}>No synced shifts for this date.</div>
            ) : (
              <div style={{ display: "grid", gap: 6 }}>
                {expandedScheduleRows.map((row) => (
                  <article key={row.id} style={{ border: "1px solid var(--line)", borderRadius: 8, padding: 8, background: "var(--surface-2)", display: "grid", gap: 2 }}>
                    <div style={{ fontWeight: 700 }}>{row.title}</div>
                    <div style={{ color: "var(--muted)", fontSize: 12 }}>{scheduleTimeLabel(row)}</div>
                    {row.location ? <div style={{ color: "var(--muted)", fontSize: 12 }}>{row.location}</div> : null}
                    {row.source_name ? <div style={{ color: "var(--muted)", fontSize: 12 }}>Source: {row.source_name}</div> : null}
                  </article>
                ))}
              </div>
            )}
          </section>

          <section style={{ display: "grid", gap: 6 }}>
            <strong>Logged Entries</strong>
            {expandedRows.length === 0 ? (
              <div style={{ color: "var(--muted)", fontSize: 14 }}>No entries for this day yet.</div>
            ) : (
              <ul style={{ margin: 0, paddingLeft: 18, display: "grid", gap: 5 }}>
                {expandedRows.map((row) => (
                  <li key={row.id}>
                    {money(Number(row.cash_tips) + Number(row.card_tips))} - {Number(row.hours_worked).toFixed(1)} hrs
                    {row.note ? ` - ${row.note}` : ""}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </section>
      ) : null}
    </main>
  );
}
