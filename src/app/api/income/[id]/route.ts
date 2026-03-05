import { NextRequest, NextResponse } from "next/server";
import { getAuthedSupabase } from "@/lib/api-auth";

function toNumber(value: unknown): number {
  const num = Number(value ?? 0);
  return Number.isFinite(num) ? Math.max(0, num) : 0;
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { supabase, user, response } = await getAuthedSupabase();
  if (!supabase || !user) return response!;

  const { id } = await params;
  const body = await request.json();

  const updates: Record<string, unknown> = {};
  if (body.shift_date !== undefined) {
    const shiftDate = String(body.shift_date).trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(shiftDate)) {
      return NextResponse.json({ error: "shift_date must be YYYY-MM-DD" }, { status: 400 });
    }
    updates.shift_date = shiftDate;
  }
  if (body.cash_tips !== undefined) updates.cash_tips = toNumber(body.cash_tips);
  if (body.card_tips !== undefined) updates.card_tips = toNumber(body.card_tips);
  if (body.hours_worked !== undefined || body.hourly_wages !== undefined) {
    updates.hourly_wages = toNumber(body.hours_worked ?? body.hourly_wages);
  }
  if (body.note !== undefined) updates.note = body.note ? String(body.note).trim() : null;

  const { data, error } = await supabase
    .from("income_entries")
    .update(updates)
    .eq("id", id)
    .eq("user_id", user.id)
    .select("id, shift_date, cash_tips, card_tips, hours_worked:hourly_wages, note, created_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ row: data });
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { supabase, user, response } = await getAuthedSupabase();
  if (!supabase || !user) return response!;

  const { id } = await params;
  const { error } = await supabase.from("income_entries").delete().eq("id", id).eq("user_id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ ok: true });
}
