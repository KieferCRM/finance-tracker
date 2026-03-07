import { NextRequest, NextResponse } from "next/server";
import { getAuthedSupabase } from "@/lib/api-auth";
import { mapScheduleError } from "@/lib/schedule/errors";
import { maskIcsUrl, normalizeIcsUrl, syncIcsSource } from "@/lib/schedule/sync";

type SourceRow = {
  id: string;
  user_id: string;
  provider: string;
  name: string;
  ics_url: string;
  last_synced_at: string | null;
  last_error: string | null;
  created_at: string;
};

function formatSource(row: SourceRow) {
  return {
    id: row.id,
    provider: row.provider,
    name: row.name,
    masked_url: maskIcsUrl(row.ics_url),
    last_synced_at: row.last_synced_at,
    last_error: row.last_error,
    created_at: row.created_at,
  };
}

export async function GET() {
  const { supabase, user, response } = await getAuthedSupabase();
  if (!supabase || !user) return response!;

  const { data, error } = await supabase
    .from("schedule_sources")
    .select("id, user_id, provider, name, ics_url, last_synced_at, last_error, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: mapScheduleError(error.message) }, { status: 400 });
  const rows = (data ?? []) as SourceRow[];

  return NextResponse.json({ rows: rows.map(formatSource) });
}

export async function POST(request: NextRequest) {
  const { supabase, user, response } = await getAuthedSupabase();
  if (!supabase || !user) return response!;

  const body = await request.json().catch(() => null);
  const name = String(body?.name ?? "").trim() || "Work Calendar";
  const rawUrl = String(body?.ics_url ?? "").trim();
  const url = normalizeIcsUrl(rawUrl);

  if (!url) {
    return NextResponse.json({ error: "Enter a valid iCal URL (https:// or webcal://)." }, { status: 400 });
  }
  if (name.length > 80) {
    return NextResponse.json({ error: "Calendar name must be 80 characters or fewer." }, { status: 400 });
  }

  const nowIso = new Date().toISOString();
  const { data: sourceData, error: sourceError } = await supabase
    .from("schedule_sources")
    .upsert(
      {
        user_id: user.id,
        provider: "ical",
        name,
        ics_url: url,
        updated_at: nowIso,
      },
      { onConflict: "user_id,ics_url" }
    )
    .select("id, user_id, provider, name, ics_url, last_synced_at, last_error, created_at")
    .single();

  if (sourceError || !sourceData) {
    return NextResponse.json({ error: mapScheduleError(sourceError?.message ?? "Failed to save calendar source.") }, { status: 400 });
  }

  const source = sourceData as SourceRow;

  try {
    const sync = await syncIcsSource(supabase, source);
    const { data: refreshed, error: refreshedError } = await supabase
      .from("schedule_sources")
      .select("id, user_id, provider, name, ics_url, last_synced_at, last_error, created_at")
      .eq("user_id", user.id)
      .eq("id", source.id)
      .single();

    if (refreshedError || !refreshed) {
      return NextResponse.json({ source: formatSource(source), sync });
    }

    return NextResponse.json({ source: formatSource(refreshed as SourceRow), sync });
  } catch (error) {
    const message = error instanceof Error ? mapScheduleError(error.message) : "Failed to sync calendar source.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
