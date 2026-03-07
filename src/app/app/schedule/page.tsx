"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

const CURRENT_MONTH = new Date().toISOString().slice(0, 7);

type SourceRow = {
  id: string;
  provider: string;
  name: string;
  masked_url: string;
  last_synced_at: string | null;
  last_error: string | null;
  created_at: string;
};

type EventRow = {
  id: string;
  source_id: string;
  source_name: string | null;
  title: string;
  location: string | null;
  notes: string | null;
  shift_date: string;
  start_time: string;
  end_time: string;
  all_day: boolean;
};

type SourcesResponse = { rows?: SourceRow[]; error?: string };
type EventsResponse = { rows?: EventRow[]; error?: string };

function prettyDate(value: string): string {
  const date = new Date(`${value}T00:00:00`);
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(date);
}

function prettyTime(startTime: string, endTime: string, allDay: boolean): string {
  if (allDay || !startTime) return "All day";
  if (endTime) return `${startTime} - ${endTime}`;
  return startTime;
}

export default function SchedulePage() {
  const [month, setMonth] = useState(CURRENT_MONTH);
  const [sources, setSources] = useState<SourceRow[]>([]);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [name, setName] = useState("Work Schedule");
  const [icsUrl, setIcsUrl] = useState("");
  const [loadingSources, setLoadingSources] = useState(true);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [savingSource, setSavingSource] = useState(false);
  const [busySourceId, setBusySourceId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function loadSources() {
    setLoadingSources(true);
    const res = await fetch("/api/schedule/sources", { cache: "no-store" });
    const json = (await res.json().catch(() => ({}))) as SourcesResponse;
    if (!res.ok) {
      setError(json.error ?? "Failed to load connected calendars.");
      setLoadingSources(false);
      return;
    }
    setSources(json.rows ?? []);
    setLoadingSources(false);
  }

  async function loadEvents(targetMonth: string) {
    setLoadingEvents(true);
    const res = await fetch(`/api/schedule/events?month=${targetMonth}`, { cache: "no-store" });
    const json = (await res.json().catch(() => ({}))) as EventsResponse;
    if (!res.ok) {
      setError(json.error ?? "Failed to load schedule.");
      setLoadingEvents(false);
      return;
    }
    setEvents(json.rows ?? []);
    setLoadingEvents(false);
  }

  useEffect(() => {
    void loadSources();
  }, []);

  useEffect(() => {
    void loadEvents(month);
  }, [month]);

  const grouped = useMemo(() => {
    const map = new Map<string, EventRow[]>();
    for (const row of events) {
      const current = map.get(row.shift_date) ?? [];
      current.push(row);
      map.set(row.shift_date, current);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [events]);

  async function onConnect(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSavingSource(true);
    setError("");
    setNotice("");

    try {
      const res = await fetch("/api/schedule/sources", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, ics_url: icsUrl }),
      });

      const json = (await res.json().catch(() => ({}))) as { error?: string; sync?: { imported?: number } };
      if (!res.ok) {
        setError(json.error ?? "Failed to connect calendar.");
        setSavingSource(false);
        return;
      }

      setIcsUrl("");
      setNotice(`Calendar connected. Imported ${json.sync?.imported ?? 0} shifts.`);
      await Promise.all([loadSources(), loadEvents(month)]);
    } catch {
      setError("Failed to connect calendar.");
    } finally {
      setSavingSource(false);
    }
  }

  async function syncSource(sourceId: string) {
    setBusySourceId(sourceId);
    setError("");
    setNotice("");

    try {
      const res = await fetch(`/api/schedule/sources/${sourceId}/sync`, { method: "POST" });
      const json = (await res.json().catch(() => ({}))) as { error?: string; imported?: number };
      if (!res.ok) {
        setError(json.error ?? "Failed to sync calendar.");
        return;
      }

      setNotice(`Calendar synced. Imported ${json.imported ?? 0} shifts.`);
      await Promise.all([loadSources(), loadEvents(month)]);
    } catch {
      setError("Failed to sync calendar.");
    } finally {
      setBusySourceId(null);
    }
  }

  async function removeSource(sourceId: string) {
    setBusySourceId(sourceId);
    setError("");
    setNotice("");

    try {
      const res = await fetch(`/api/schedule/sources/${sourceId}`, { method: "DELETE" });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(json.error ?? "Failed to remove calendar.");
        return;
      }

      setNotice("Calendar removed.");
      await Promise.all([loadSources(), loadEvents(month)]);
    } catch {
      setError("Failed to remove calendar.");
    } finally {
      setBusySourceId(null);
    }
  }

  return (
    <main style={{ display: "grid", gap: 12 }}>
      <section
        style={{
          border: "1px solid #2dbf5c",
          borderRadius: 14,
          padding: 14,
          background: "linear-gradient(145deg, #1fce57 0%, #16a34a 100%)",
          color: "#f5fff8",
          display: "grid",
          gap: 8,
        }}
      >
        <h1 style={{ margin: 0, fontSize: 26 }}>Shift Schedule</h1>
        <div style={{ fontSize: 14, color: "rgba(245,255,248,0.92)" }}>Connect Google Calendar or iOS Calendar using an iCal link.</div>
      </section>

      <section style={{ border: "1px solid var(--line)", borderRadius: 12, padding: 12, background: "var(--surface)", display: "grid", gap: 10 }}>
        <h2 style={{ margin: 0 }}>Connect Calendar</h2>
        <form onSubmit={onConnect} style={{ display: "grid", gap: 8 }}>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={80}
            placeholder="Calendar name"
            style={{ padding: "12px 14px", borderRadius: 10, border: "1px solid var(--line)", background: "var(--surface-2)", color: "var(--text)" }}
          />
          <input
            type="url"
            required
            value={icsUrl}
            onChange={(e) => setIcsUrl(e.target.value)}
            placeholder="Paste iCal URL (webcal:// or https://)"
            style={{ padding: "12px 14px", borderRadius: 10, border: "1px solid var(--line)", background: "var(--surface-2)", color: "var(--text)" }}
          />
          <button
            type="submit"
            disabled={savingSource}
            style={{
              border: "none",
              borderRadius: 10,
              padding: "12px 14px",
              background: "linear-gradient(145deg, #31d266 0%, #18b24f 100%)",
              color: "#06280f",
              fontWeight: 800,
            }}
          >
            {savingSource ? "Connecting..." : "Connect + Sync"}
          </button>
        </form>
        <div style={{ color: "var(--muted)", fontSize: 12, lineHeight: 1.4 }}>
          Google: Open Calendar settings, then Integrate calendar, then copy the Secret address in iCal format.
          <br />
          Apple/iCloud: Share calendar and copy its public iCal link.
        </div>
      </section>

      {error ? <section style={{ color: "var(--danger)" }}>{error}</section> : null}
      {notice ? <section style={{ color: "var(--mint)" }}>{notice}</section> : null}

      <section style={{ border: "1px solid var(--line)", borderRadius: 12, padding: 12, background: "var(--surface)", display: "grid", gap: 8 }}>
        <h2 style={{ margin: 0 }}>Connected Calendars</h2>
        {loadingSources ? (
          <div style={{ color: "var(--muted)" }}>Loading connected calendars...</div>
        ) : sources.length === 0 ? (
          <div style={{ color: "var(--muted)" }}>No calendars connected yet.</div>
        ) : (
          <div style={{ display: "grid", gap: 8 }}>
            {sources.map((source) => {
              const busy = busySourceId === source.id;
              return (
                <article key={source.id} style={{ border: "1px solid var(--line)", borderRadius: 10, padding: 10, background: "var(--surface-2)", display: "grid", gap: 6 }}>
                  <div style={{ fontWeight: 700 }}>{source.name}</div>
                  <div style={{ color: "var(--muted)", fontSize: 12 }}>{source.masked_url}</div>
                  <div style={{ color: source.last_error ? "var(--danger)" : "var(--muted)", fontSize: 12 }}>
                    {source.last_error
                      ? `Last error: ${source.last_error}`
                      : `Last synced: ${source.last_synced_at ? new Date(source.last_synced_at).toLocaleString() : "Never"}`}
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      type="button"
                      onClick={() => void syncSource(source.id)}
                      disabled={busy}
                      style={{ border: "1px solid var(--line)", borderRadius: 8, padding: "8px 10px", background: "#16271d", color: "var(--text)" }}
                    >
                      {busy ? "Working..." : "Sync"}
                    </button>
                    <button
                      type="button"
                      onClick={() => void removeSource(source.id)}
                      disabled={busy}
                      style={{ border: "1px solid #5b2f2f", borderRadius: 8, padding: "8px 10px", background: "#2e1a1a", color: "#ffdede" }}
                    >
                      Remove
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section style={{ border: "1px solid var(--line)", borderRadius: 12, padding: 12, background: "var(--surface)", display: "grid", gap: 10 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <h2 style={{ margin: 0 }}>Month Schedule</h2>
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid var(--line)", background: "var(--surface-2)", color: "var(--text)" }}
          />
        </div>

        {loadingEvents ? (
          <div style={{ color: "var(--muted)" }}>Loading schedule...</div>
        ) : grouped.length === 0 ? (
          <div style={{ color: "var(--muted)" }}>No shifts found for this month.</div>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {grouped.map(([date, rows]) => (
              <article key={date} style={{ border: "1px solid var(--line)", borderRadius: 10, padding: 10, background: "var(--surface-2)", display: "grid", gap: 8 }}>
                <strong>{prettyDate(date)}</strong>
                <div style={{ display: "grid", gap: 6 }}>
                  {rows.map((row) => (
                    <div key={row.id} style={{ border: "1px solid #2f3743", borderRadius: 8, padding: 8, background: "#11161d", display: "grid", gap: 3 }}>
                      <div style={{ fontWeight: 700 }}>{row.title}</div>
                      <div style={{ color: "var(--muted)", fontSize: 12 }}>{prettyTime(row.start_time, row.end_time, row.all_day)}</div>
                      {row.location ? <div style={{ color: "var(--muted)", fontSize: 12 }}>{row.location}</div> : null}
                      {row.source_name ? <div style={{ color: "var(--muted)", fontSize: 12 }}>Source: {row.source_name}</div> : null}
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
