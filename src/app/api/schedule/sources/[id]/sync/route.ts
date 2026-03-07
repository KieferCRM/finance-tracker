import { NextResponse } from "next/server";
import { getAuthedSupabase } from "@/lib/api-auth";
import { mapScheduleError } from "@/lib/schedule/errors";
import { syncIcsSource } from "@/lib/schedule/sync";

type SourceRow = {
  id: string;
  user_id: string;
  name: string;
  ics_url: string;
};

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { supabase, user, response } = await getAuthedSupabase();
  if (!supabase || !user) return response!;

  const { id } = await params;
  const sourceId = String(id ?? "").trim();
  if (!sourceId) {
    return NextResponse.json({ error: "source id is required." }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("schedule_sources")
    .select("id, user_id, name, ics_url")
    .eq("user_id", user.id)
    .eq("id", sourceId)
    .single();
  if (error || !data) {
    return NextResponse.json({ error: mapScheduleError(error?.message ?? "Calendar source not found.") }, { status: 404 });
  }

  try {
    const result = await syncIcsSource(supabase, data as SourceRow);
    return NextResponse.json({ ok: true, ...result });
  } catch (syncError) {
    const message = syncError instanceof Error ? mapScheduleError(syncError.message) : "Failed to sync calendar source.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
