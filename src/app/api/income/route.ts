import { NextRequest, NextResponse } from "next/server";
import { getAuthedSupabase } from "@/lib/api-auth";
import { syncEventToGoogleSheets } from "@/lib/integrations/google-sheets";
import { monthRangeFromParam } from "@/lib/reporting/month";

function toNumber(value: unknown): number {
  const num = Number(value ?? 0);
  return Number.isFinite(num) ? Math.max(0, num) : 0;
}

export async function GET(request: NextRequest) {
  const { supabase, user, response } = await getAuthedSupabase();
  if (!supabase || !user) return response!;

  const month = request.nextUrl.searchParams.get("month");
  const limitRaw = request.nextUrl.searchParams.get("limit");
  const limit = limitRaw ? Math.max(1, Math.min(5000, Number(limitRaw) || 50)) : 50;

  let query = supabase
    .from("income_entries")
    .select("id, shift_date, cash_tips, card_tips, hours_worked:hourly_wages, note, created_at")
    .eq("user_id", user.id)
    .order("shift_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit);

  if (month) {
    const range = monthRangeFromParam(month);
    query = query.gte("shift_date", range.startDate).lte("shift_date", range.endDate);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ rows: data ?? [] });
}

export async function POST(request: NextRequest) {
  const { supabase, user, response } = await getAuthedSupabase();
  if (!supabase || !user) return response!;

  const body = await request.json();
  const shiftDate = String(body.shift_date ?? "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(shiftDate)) {
    return NextResponse.json({ error: "shift_date must be YYYY-MM-DD" }, { status: 400 });
  }

  const payload = {
    user_id: user.id,
    shift_date: shiftDate,
    cash_tips: toNumber(body.cash_tips),
    card_tips: toNumber(body.card_tips),
    hourly_wages: toNumber(body.hours_worked ?? body.hourly_wages),
    note: body.note ? String(body.note).trim() : null,
  };

  const { data, error } = await supabase
    .from("income_entries")
    .insert(payload)
    .select("id, shift_date, cash_tips, card_tips, hours_worked:hourly_wages, note, created_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  void syncEventToGoogleSheets({
    event: "income_created",
    user_id: user.id,
    row: data,
  }).catch((syncError) => {
    console.error("Google Sheets sync failed (income):", syncError);
  });

  return NextResponse.json({ row: data }, { status: 201 });
}
