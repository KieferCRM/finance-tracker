import { NextResponse } from "next/server";
import { getAuthedSupabase } from "@/lib/api-auth";
import { mapScheduleError } from "@/lib/schedule/errors";

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { supabase, user, response } = await getAuthedSupabase();
  if (!supabase || !user) return response!;

  const { id } = await params;
  const sourceId = String(id ?? "").trim();
  if (!sourceId) {
    return NextResponse.json({ error: "source id is required." }, { status: 400 });
  }

  const { error } = await supabase.from("schedule_sources").delete().eq("user_id", user.id).eq("id", sourceId);
  if (error) return NextResponse.json({ error: mapScheduleError(error.message) }, { status: 400 });

  return NextResponse.json({ ok: true });
}
