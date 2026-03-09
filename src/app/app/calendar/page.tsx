"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { isDayOffEntry } from "@/lib/calendar";

const TODAY = new Date().toISOString().slice(0, 10);
const CURRENT_MONTH = TODAY.slice(0, 7);
const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const ONBOARDING_DISMISSED_KEY = "tiptab_onboarding_dismissed_v1";
const MONTHLY_INCOME_GOAL_KEY = "lcl_monthly_income_goal";
const DEFAULT_MONTHLY_INCOME_GOAL = 4500;

type IncomeRow = {
  id: string;
  shift_date: string;
  cash_tips: number;
  card_tips: number;
  tipout?: number;
  parking?: number;
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

function shiftTakeHome(row: IncomeRow): number {
  return Number(row.cash_tips) + Number(row.card_tips) - Number(row.parking ?? 0);
}

function CalendarMascot() {
  return (
    <div style={{ width: 68, height: 68, display: "grid", placeItems: "center", filter: "drop-shadow(0 10px 18px rgba(255, 216, 77, 0.35))" }}>
      <svg width="66" height="66" viewBox="0 0 96 96" role="img" aria-label="TipTapped mascot">
        <defs>
          <linearGradient id="workerBody" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffef8a" />
            <stop offset="100%" stopColor="#f0bf00" />
          </linearGradient>
          <linearGradient id="workerWing" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f6fbff" stopOpacity="0.92" />
            <stop offset="100%" stopColor="#d3e3ff" stopOpacity="0.65" />
          </linearGradient>
        </defs>
        <path d="M26 70 l7 -12 h14 l7 12 z" fill="#20304c" />
        <ellipse cx="35" cy="40" rx="11" ry="15" fill="url(#workerWing)" transform="rotate(-22 35 40)" />
        <ellipse cx="61" cy="40" rx="11" ry="15" fill="url(#workerWing)" transform="rotate(22 61 40)" />
        <ellipse cx="48" cy="55" rx="19" ry="16" fill="url(#workerBody)" />
        <rect x="31" y="49" width="34" height="4.5" rx="2.25" fill="#1f2a44" />
        <rect x="31" y="57" width="34" height="4.5" rx="2.25" fill="#1f2a44" />
        <rect x="33" y="64.5" width="30" height="4" rx="2" fill="#1f2a44" />
        <circle cx="48" cy="34" r="11" fill="#1f2a44" />
        <path d="M39 29 h18 l-2 -5 h-14 z" fill="#ffe05e" />
        <circle cx="44" cy="33.5" r="1.7" fill="#f5f9ff" />
        <circle cx="52" cy="33.5" r="1.7" fill="#f5f9ff" />
        <path d="M44 37 q4 2.8 8 0" stroke="#f5f9ff" strokeWidth="1.6" fill="none" strokeLinecap="round" />
        <path d="M42 24 q-4 -8 -10 -9" stroke="#1f2a44" strokeWidth="2.2" fill="none" strokeLinecap="round" />
        <path d="M54 24 q4 -8 10 -9" stroke="#1f2a44" strokeWidth="2.2" fill="none" strokeLinecap="round" />
        <circle cx="31.5" cy="14.8" r="2.3" fill="#ffd84d" />
        <circle cx="64.5" cy="14.8" r="2.3" fill="#ffd84d" />
        <path d="M56 70 l7 5" stroke="#1f2a44" strokeWidth="2.4" strokeLinecap="round" />
        <circle cx="64.5" cy="76" r="2.6" fill="#ffe98e" stroke="#1f2a44" strokeWidth="1.2" />
      </svg>
    </div>
  );
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
  const [monthlyGoal, setMonthlyGoal] = useState(DEFAULT_MONTHLY_INCOME_GOAL);

  const [cashTips, setCashTips] = useState("");
  const [cardTips, setCardTips] = useState("");
  const [tipout, setTipout] = useState("");
  const [parking, setParking] = useState("");
  const [hoursWorked, setHoursWorked] = useState("");
  const [note, setNote] = useState("");

  const [editingRowId, setEditingRowId] = useState<string | null>(null);
  const [editCashTips, setEditCashTips] = useState("");
  const [editCardTips, setEditCardTips] = useState("");
  const [editTipout, setEditTipout] = useState("");
  const [editParking, setEditParking] = useState("");
  const [editHoursWorked, setEditHoursWorked] = useState("");
  const [editNote, setEditNote] = useState("");

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
    setEditingRowId(null);
    setEditCashTips("");
    setEditCardTips("");
    setEditTipout("");
    setEditParking("");
    setEditHoursWorked("");
    setEditNote("");
  }, [expandedDate]);

  useEffect(() => {
    const dismissed = window.localStorage.getItem(ONBOARDING_DISMISSED_KEY) === "true";
    setShowOnboarding(!dismissed);

    const storedGoal = Number(window.localStorage.getItem(MONTHLY_INCOME_GOAL_KEY));
    if (Number.isFinite(storedGoal) && storedGoal > 0) {
      setMonthlyGoal(storedGoal);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(MONTHLY_INCOME_GOAL_KEY, String(monthlyGoal));
  }, [monthlyGoal]);

  const dailyTotals = useMemo(() => {
    const totals = new Map<string, { tips: number; hours: number; count: number }>();
    for (const row of incomeRows) {
      if (isDayOffEntry(row)) continue;
      const current = totals.get(row.shift_date) ?? { tips: 0, hours: 0, count: 0 };
      totals.set(row.shift_date, {
        tips: current.tips + shiftTakeHome(row),
        hours: current.hours + Number(row.hours_worked),
        count: current.count + 1,
      });
    }
    return totals;
  }, [incomeRows]);

  const computedMonthSummary = useMemo(() => {
    const earnings = incomeRows.reduce((sum, row) => (isDayOffEntry(row) ? sum : sum + shiftTakeHome(row)), 0);
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
    setCurrentReport(latest.currentReport);
    setLastMonthReport(latest.previousReport);
  }

  async function saveShift(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!expandedDate) return;

    setSaving(true);
    setError("");

    try {
      const existingRows = incomeRows.filter((row) => row.shift_date === expandedDate && !isDayOffEntry(row));
      const firstRow = existingRows[0];

      const parsedCash = Math.max(0, Number(cashTips) || 0);
      const parsedCard = Math.max(0, Number(cardTips) || 0);
      const parsedTipout = Math.max(0, Number(tipout) || 0);
      const parsedParking = Math.max(0, Number(parking) || 0);
      const parsedHours = Math.max(0, Number(hoursWorked) || 0);

      const res = firstRow
        ? await fetch(`/api/income/${firstRow.id}`, {
            method: "PATCH",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              cash_tips: Number(firstRow.cash_tips) + parsedCash,
              card_tips: Number(firstRow.card_tips) + parsedCard,
              tipout: Number(firstRow.tipout ?? 0) + parsedTipout,
              parking: Number(firstRow.parking ?? 0) + parsedParking,
              hours_worked: parsedHours > 0 ? parsedHours : Number(firstRow.hours_worked),
              note: note.trim() ? note.trim() : firstRow.note ?? "",
            }),
          })
        : await fetch("/api/income", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              shift_date: expandedDate,
              cash_tips: parsedCash,
              card_tips: parsedCard,
              tipout: parsedTipout,
              parking: parsedParking,
              hours_worked: parsedHours,
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
      setTipout("");
      setParking("");
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
            tipout: 0,
            parking: 0,
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

  function startEditingRow(row: IncomeRow) {
    setEditingRowId(row.id);
    setEditCashTips(String(Number(row.cash_tips) || 0));
    setEditCardTips(String(Number(row.card_tips) || 0));
    setEditTipout(String(Number(row.tipout ?? 0) || 0));
    setEditParking(String(Number(row.parking ?? 0) || 0));
    setEditHoursWorked(String(Number(row.hours_worked) || 0));
    setEditNote(row.note ?? "");
  }

  function cancelEditingRow() {
    setEditingRowId(null);
    setEditCashTips("");
    setEditCardTips("");
    setEditTipout("");
    setEditParking("");
    setEditHoursWorked("");
    setEditNote("");
  }

  async function saveEditedRow(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingRowId) return;

    setSaving(true);
    setError("");

    try {
      const res = await fetch(`/api/income/${editingRowId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          cash_tips: editCashTips,
          card_tips: editCardTips,
          tipout: editTipout,
          parking: editParking,
          hours_worked: editHoursWorked,
          note: editNote,
        }),
      });

      if (!res.ok) {
        const json = (await res.json().catch(() => ({}))) as { error?: string };
        setError(json.error ?? "Failed to update entry.");
        return;
      }

      cancelEditingRow();
      await refreshAfterSave();
    } catch {
      setError("Failed to update entry.");
    } finally {
      setSaving(false);
    }
  }

  const expandedTotals = expandedDate ? dailyTotals.get(expandedDate) ?? { tips: 0, hours: 0, count: 0 } : { tips: 0, hours: 0, count: 0 };

  const expandedRows = expandedDate ? incomeRows.filter((row) => row.shift_date === expandedDate && !isDayOffEntry(row)) : [];
  const expandedDayOffRows = expandedDate ? incomeRows.filter((row) => row.shift_date === expandedDate && isDayOffEntry(row)) : [];
  const isExpandedDayOff = expandedDayOffRows.length > 0;

  const monthTitle = monthLabel(month);
  const previousMonthValue = previousMonth(month);
  const previousMonthTitle = monthLabel(previousMonthValue);

  const currentMonthEarnings = currentReport?.totalIncome ?? computedMonthSummary.earnings;
  const currentMonthHours = currentReport?.totalHours ?? computedMonthSummary.hours;
  const takeHomePerHour = currentMonthHours > 0 ? currentMonthEarnings / currentMonthHours : 0;
  const monthlyGoalProgressPct = monthlyGoal > 0 ? Math.max(0, Math.min(100, (currentMonthEarnings / monthlyGoal) * 100)) : 0;
  const monthlyGoalRemaining = Math.max(0, monthlyGoal - currentMonthEarnings);

  function dismissOnboarding() {
    setShowOnboarding(false);
    window.localStorage.setItem(ONBOARDING_DISMISSED_KEY, "true");
  }

  function goPreviousMonth() {
    setMonth((current) => previousMonth(current));
  }

  function goNextMonth() {
    setMonth((current) => nextMonth(current));
  }

  return (
    <main style={{ display: "grid", gap: 12 }}>
      <section style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
        <CalendarMascot />
        <div style={{ display: "grid", gap: 2, textAlign: "right" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 6 }}>
            <button
              type="button"
              onClick={goPreviousMonth}
              aria-label="Go to previous month"
              style={{
                width: 26,
                height: 26,
                borderRadius: 999,
                border: "1px solid var(--line)",
                background: "var(--surface-2)",
                color: "var(--text)",
                fontSize: 16,
                lineHeight: 1,
                padding: 0,
              }}
            >
              ‹
            </button>
            <strong style={{ fontSize: 22, color: "var(--neon)", textShadow: "0 0 12px rgba(255, 216, 77, 0.35)" }}>{monthTitle}</strong>
            <button
              type="button"
              onClick={goNextMonth}
              aria-label="Go to next month"
              style={{
                width: 26,
                height: 26,
                borderRadius: 999,
                border: "1px solid var(--line)",
                background: "var(--surface-2)",
                color: "var(--text)",
                fontSize: 16,
                lineHeight: 1,
                padding: 0,
              }}
            >
              ›
            </button>
          </div>
          <span style={{ color: "var(--muted)", fontSize: 12 }}>Use arrows to change month</span>
        </div>
      </section>

      <section
        style={{
          border: "1px solid rgba(255, 216, 77, 0.88)",
          borderRadius: 12,
          background: "var(--surface)",
          color: "var(--text)",
          padding: 10,
          display: "grid",
          gap: 10,
          boxShadow: "0 8px 24px rgba(255, 216, 77, 0.2)",
        }}
      >
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 8 }}>
          <article style={{ background: "var(--surface-2)", borderRadius: 10, padding: 8, border: "1px solid rgba(255, 216, 77, 0.65)" }}>
            <div style={{ fontSize: 11, color: "var(--muted)" }}>Take Home</div>
            <div style={{ fontWeight: 700 }}>{money(currentMonthEarnings)}</div>
          </article>
          <article style={{ background: "var(--surface-2)", borderRadius: 10, padding: 8, border: "1px solid rgba(255, 216, 77, 0.65)" }}>
            <div style={{ fontSize: 11, color: "var(--muted)" }}>Hours</div>
            <div style={{ fontWeight: 700 }}>{currentMonthHours.toFixed(2)}</div>
          </article>
          <article style={{ background: "var(--surface-2)", borderRadius: 10, padding: 8, border: "1px solid rgba(255, 216, 77, 0.65)" }}>
            <div style={{ fontSize: 11, color: "var(--muted)" }}>Take Home / Hour</div>
            <div style={{ fontWeight: 700 }}>{money(takeHomePerHour)}</div>
          </article>
        </div>

        <article style={{ background: "var(--surface-2)", borderRadius: 10, padding: 10, border: "1px solid rgba(255, 216, 77, 0.65)" }}>
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
            <div style={{ color: "var(--muted)", fontSize: 13 }}>Tap a date to log shift details.</div>
          </article>
        ) : null}
      </section>

      {error ? <section style={{ color: "var(--danger)" }}>{error}</section> : null}

      <section style={{ border: "1px solid rgba(255, 216, 77, 0.72)", borderRadius: 12, background: "var(--surface)", padding: 12, display: "grid", gap: 8 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <strong style={{ fontSize: 14 }}>Monthly Goal Tracker</strong>
          <span style={{ color: "var(--muted)", fontSize: 12 }}>{monthlyGoalProgressPct.toFixed(0)}%</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 140px", gap: 8 }}>
          <div style={{ color: "var(--muted)", fontSize: 13, display: "grid", alignContent: "center" }}>
            {money(currentMonthEarnings)} / {money(monthlyGoal)} · Remaining {money(monthlyGoalRemaining)}
          </div>
          <input
            type="number"
            min="0"
            step="50"
            value={monthlyGoal}
            onChange={(e) => setMonthlyGoal(Math.max(0, Number(e.target.value) || 0))}
            placeholder="Goal"
            style={{ padding: "9px 10px", borderRadius: 8, border: "1px solid var(--line)", background: "#0f1726", color: "var(--text)" }}
          />
        </div>
        <div style={{ height: 10, borderRadius: 999, background: "var(--surface-2)", overflow: "hidden" }}>
          <div style={{ width: `${monthlyGoalProgressPct}%`, height: "100%", background: "var(--neon)" }} />
        </div>
      </section>

      {loading ? (
        <section style={{ color: "var(--muted)" }}>Loading calendar...</section>
      ) : (
        <section style={{ border: "1px solid rgba(255, 216, 77, 0.78)", borderRadius: 12, background: "var(--surface)", color: "var(--text)", overflow: "hidden" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))", background: "linear-gradient(90deg, #fff3a3 0%, #ffd84d 50%, #f5c400 100%)", color: "#2b2200" }}>
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
                    background: isActive ? "#3a3417" : isDayOff ? "#2e2538" : "var(--surface-2)",
                    color: "var(--text)",
                    minHeight: 88,
                    padding: 6,
                    textAlign: "left",
                    display: "grid",
                    alignContent: "space-between",
                    gap: 4,
                    cursor: "pointer",
                    boxShadow: isToday ? "inset 0 0 0 2px var(--neon), 0 0 0 1px rgba(255, 216, 77, 0.52)" : "none",
                  }}
                >
                  <div style={{ fontWeight: 700, fontSize: 20 }}>{cell.day}</div>
                  <div style={{ display: "grid", gap: 3 }}>
                    {totals ? <span style={{ fontSize: 11, color: "var(--text)" }}>{money(totals.tips)}</span> : null}
                    {totals ? <span style={{ fontSize: 11, color: "var(--muted)" }}>{totals.hours.toFixed(1)}h</span> : null}
                    {isDayOff ? (
                      <span
                        style={{
                          fontSize: 10,
                          borderRadius: 999,
                          background: "#3a2430",
                          color: "#ffd2dc",
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

          <div style={{ color: "var(--muted)", fontSize: 14 }}>Logged take-home: {money(expandedTotals.tips)} and {expandedTotals.hours.toFixed(1)} hrs</div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button
              type="button"
              disabled={saving}
              onClick={() => void toggleDayOff()}
              style={{
                border: "1px solid var(--line)",
                borderRadius: 10,
                padding: "10px 12px",
                background: isExpandedDayOff ? "#3a2430" : "var(--surface-2)",
                color: "var(--text)",
                fontWeight: 700,
              }}
            >
              {isExpandedDayOff ? "Clear Off Day" : "Off Day"}
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
                style={{ padding: "12px 12px", borderRadius: 10, border: "1px solid var(--line)", background: "#0f1726", color: "var(--text)" }}
              />
              <input
                type="number"
                step="0.01"
                min="0"
                value={cardTips}
                onChange={(e) => setCardTips(e.target.value)}
                placeholder="Card Tips"
                style={{ padding: "12px 12px", borderRadius: 10, border: "1px solid var(--line)", background: "#0f1726", color: "var(--text)" }}
              />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <input
                type="number"
                step="0.01"
                min="0"
                value={tipout}
                onChange={(e) => setTipout(e.target.value)}
                placeholder="Tipout"
                style={{ padding: "12px 12px", borderRadius: 10, border: "1px solid var(--line)", background: "#0f1726", color: "var(--text)" }}
              />
              <input
                type="number"
                step="0.01"
                min="0"
                value={parking}
                onChange={(e) => setParking(e.target.value)}
                placeholder="- Parking"
                style={{ padding: "12px 12px", borderRadius: 10, border: "1px solid var(--line)", background: "#0f1726", color: "var(--text)" }}
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
                style={{ padding: "12px 12px", borderRadius: 10, border: "1px solid var(--line)", background: "#0f1726", color: "var(--text)" }}
              />
              <button
                type="submit"
                disabled={saving}
                style={{ border: "none", borderRadius: 10, padding: "12px 16px", background: "var(--neon)", color: "#2a1a00", fontWeight: 800 }}
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
              style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid var(--line)", background: "#0f1726", color: "var(--text)", resize: "vertical" }}
            />
          </form>

          <section style={{ display: "grid", gap: 6 }}>
            <strong>Logged Entries</strong>
            {expandedRows.length === 0 ? (
              <div style={{ color: "var(--muted)", fontSize: 14 }}>No entries for this day yet.</div>
            ) : (
              <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "grid", gap: 8 }}>
                {expandedRows.map((row) => (
                  <li key={row.id} style={{ border: "1px solid var(--line)", borderRadius: 10, padding: 10, background: "var(--surface-2)", display: "grid", gap: 8 }}>
                    {editingRowId === row.id ? (
                      <form onSubmit={saveEditedRow} style={{ display: "grid", gap: 8 }}>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={editCashTips}
                            onChange={(e) => setEditCashTips(e.target.value)}
                            placeholder="Cash Tips"
                            style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid var(--line)", background: "#0f1726", color: "var(--text)" }}
                          />
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={editCardTips}
                            onChange={(e) => setEditCardTips(e.target.value)}
                            placeholder="Card Tips"
                            style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid var(--line)", background: "#0f1726", color: "var(--text)" }}
                          />
                        </div>

                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={editTipout}
                            onChange={(e) => setEditTipout(e.target.value)}
                            placeholder="Tipout"
                            style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid var(--line)", background: "#0f1726", color: "var(--text)" }}
                          />
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={editParking}
                            onChange={(e) => setEditParking(e.target.value)}
                            placeholder="- Parking"
                            style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid var(--line)", background: "#0f1726", color: "var(--text)" }}
                          />
                        </div>

                        <input
                          type="number"
                          step="0.25"
                          min="0"
                          value={editHoursWorked}
                          onChange={(e) => setEditHoursWorked(e.target.value)}
                          placeholder="Hours Worked"
                          style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid var(--line)", background: "#0f1726", color: "var(--text)" }}
                        />

                        <textarea
                          value={editNote}
                          onChange={(e) => setEditNote(e.target.value)}
                          placeholder="Notes (optional)"
                          rows={2}
                          maxLength={500}
                          style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid var(--line)", background: "#0f1726", color: "var(--text)", resize: "vertical" }}
                        />

                        <div style={{ display: "flex", gap: 8 }}>
                          <button
                            type="submit"
                            disabled={saving}
                            style={{ border: "none", borderRadius: 10, padding: "10px 12px", background: "var(--neon)", color: "#2a1a00", fontWeight: 800 }}
                          >
                            {saving ? "Saving..." : "Save Changes"}
                          </button>
                          <button
                            type="button"
                            disabled={saving}
                            onClick={cancelEditingRow}
                            style={{ border: "1px solid var(--line)", borderRadius: 10, padding: "10px 12px", background: "var(--surface)", color: "var(--text)" }}
                          >
                            Cancel
                          </button>
                        </div>
                      </form>
                    ) : (
                      <div style={{ display: "grid", gap: 8 }}>
                        <div>
                          <strong>{money(shiftTakeHome(row))}</strong> - {Number(row.hours_worked).toFixed(1)} hrs
                        </div>
                        <div style={{ color: "var(--muted)", fontSize: 13 }}>
                          Cash {money(Number(row.cash_tips))}, Card {money(Number(row.card_tips))}, Tipout {money(Number(row.tipout ?? 0))}, Parking -{money(Number(row.parking ?? 0))}
                        </div>
                        {row.note ? <div style={{ color: "var(--muted)", fontSize: 13 }}>{row.note}</div> : null}
                        <div>
                          <button
                            type="button"
                            disabled={saving}
                            onClick={() => startEditingRow(row)}
                            style={{ border: "1px solid var(--line)", borderRadius: 8, padding: "7px 10px", background: "var(--surface)", color: "var(--text)" }}
                          >
                            Edit
                          </button>
                        </div>
                      </div>
                    )}
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
