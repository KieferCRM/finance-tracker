import { parseIcsEvents } from "@/lib/schedule/ics";

type SourceRow = {
  id: string;
  user_id: string;
  name: string;
  ics_url: string;
};

type SupabaseLike = {
  from: (table: string) => any;
};

export type SyncSourceResult = {
  source_id: string;
  imported: number;
};

export function normalizeIcsUrl(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  try {
    const url = new URL(trimmed);
    if (url.protocol === "webcal:") {
      url.protocol = "https:";
    }
    if (url.protocol !== "https:" && url.protocol !== "http:") {
      return null;
    }
    if (!url.hostname) return null;
    return url.toString();
  } catch {
    return null;
  }
}

export function maskIcsUrl(raw: string): string {
  try {
    const url = new URL(raw);
    const path = url.pathname.length > 28 ? `${url.pathname.slice(0, 28)}...` : url.pathname;
    return `${url.protocol}//${url.hostname}${path || "/"}`;
  } catch {
    return "Invalid URL";
  }
}

async function fetchIcsText(url: string): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(url, {
      method: "GET",
      signal: controller.signal,
      headers: {
        accept: "text/calendar,text/plain,*/*",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`Calendar source returned ${response.status}.`);
    }

    const text = await response.text();
    if (!text.trim()) {
      throw new Error("Calendar feed was empty.");
    }
    if (text.length > 5_000_000) {
      throw new Error("Calendar feed is too large.");
    }

    return text;
  } finally {
    clearTimeout(timeout);
  }
}

async function setSourceError(supabase: SupabaseLike, userId: string, sourceId: string, message: string) {
  await supabase
    .from("schedule_sources")
    .update({
      last_error: message.slice(0, 500),
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId)
    .eq("id", sourceId);
}

export async function syncIcsSource(supabase: SupabaseLike, source: SourceRow): Promise<SyncSourceResult> {
  try {
    const icsText = await fetchIcsText(source.ics_url);
    const parsed = parseIcsEvents(icsText);

    const rows = parsed.map((event) => ({
      user_id: source.user_id,
      source_id: source.id,
      external_id: event.external_id,
      title: event.title.slice(0, 180),
      location: event.location ? event.location.slice(0, 240) : null,
      notes: event.notes ? event.notes.slice(0, 2000) : null,
      shift_date: event.shift_date,
      start_time: event.start_time,
      end_time: event.end_time,
      all_day: event.all_day,
      updated_at: new Date().toISOString(),
    }));

    const { error: deleteError } = await supabase
      .from("schedule_events")
      .delete()
      .eq("user_id", source.user_id)
      .eq("source_id", source.id);
    if (deleteError) {
      throw new Error(deleteError.message);
    }

    if (rows.length > 0) {
      const chunkSize = 500;
      for (let i = 0; i < rows.length; i += chunkSize) {
        const chunk = rows.slice(i, i + chunkSize);
        const { error: insertError } = await supabase.from("schedule_events").insert(chunk);
        if (insertError) {
          throw new Error(insertError.message);
        }
      }
    }

    const nowIso = new Date().toISOString();
    const { error: updateError } = await supabase
      .from("schedule_sources")
      .update({
        last_synced_at: nowIso,
        last_error: null,
        updated_at: nowIso,
      })
      .eq("user_id", source.user_id)
      .eq("id", source.id);
    if (updateError) {
      throw new Error(updateError.message);
    }

    return { source_id: source.id, imported: rows.length };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to sync calendar source.";
    await setSourceError(supabase, source.user_id, source.id, message);
    throw new Error(message);
  }
}
