import { NextRequest, NextResponse } from "next/server";
import { getAuthedSupabase } from "@/lib/api-auth";
import { monthRangeFromParam } from "@/lib/reporting/month";
import { mapScheduleError } from "@/lib/schedule/errors";

type EventRow = {
  id: string;
  source_id: string;
  title: string;
  location: string | null;
  notes: string | null;
  shift_date: string;
  start_time: string;
  end_time: string;
  all_day: boolean;
};

export async function GET(request: NextRequest) {
  const { supabase, user, response } = await getAuthedSupabase();
  if (!supabase || !user) return response!;

  const month = request.nextUrl.searchParams.get("month") ?? new Date().toISOString().slice(0, 7);
  const range = monthRangeFromParam(month);

  const { data: eventsData, error: eventsError } = await supabase
    .from("schedule_events")
    .select("id, source_id, title, location, notes, shift_date, start_time, end_time, all_day")
    .eq("user_id", user.id)
    .gte("shift_date", range.startDate)
    .lte("shift_date", range.endDate)
    .order("shift_date", { ascending: true })
    .order("start_time", { ascending: true });

  if (eventsError) return NextResponse.json({ error: mapScheduleError(eventsError.message) }, { status: 400 });

  const rows = (eventsData ?? []) as EventRow[];
  const sourceIds = Array.from(new Set(rows.map((row) => row.source_id)));

  let sourceNames = new Map<string, string>();
  if (sourceIds.length > 0) {
    const { data: sourcesData, error: sourcesError } = await supabase
      .from("schedule_sources")
      .select("id, name")
      .eq("user_id", user.id)
      .in("id", sourceIds);

    if (!sourcesError && sourcesData) {
      sourceNames = new Map<string, string>(sourcesData.map((source: { id: string; name: string }) => [source.id, source.name]));
    }
  }

  return NextResponse.json({
    rows: rows.map((row) => ({
      ...row,
      source_name: sourceNames.get(row.source_id) ?? null,
    })),
  });
}
