import { NextRequest, NextResponse } from "next/server";
import { getAuthedSupabase } from "@/lib/api-auth";
import { syncEventToGoogleSheets } from "@/lib/integrations/google-sheets";
import { monthRangeFromParam } from "@/lib/reporting/month";
import { DAY_OFF_NOTE, isDayOffEntry } from "@/lib/calendar";

function toNumber(value: unknown): number {
  const num = Number(value ?? 0);
  return Number.isFinite(num) ? Math.max(0, num) : 0;
}

export async function GET(request: NextRequest) {
  const { supabase, user, response } = await getAuthedSupabase();
  if (!supabase || !user) return response!;

  const month = request.nextUrl.searchParams.get("month");
  const includeDayOff = request.nextUrl.searchParams.get("include_day_off") === "true";
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

  const rows = data ?? [];
  const filteredRows = includeDayOff ? rows : rows.filter((row) => !isDayOffEntry(row));

  return NextResponse.json({ rows: filteredRows });
}

export async function POST(request: NextRequest) {
  const { supabase, user, response } = await getAuthedSupabase();
  if (!supabase || !user) return response!;

  const body = await request.json();
  const shiftDate = String(body.shift_date ?? "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(shiftDate)) {
    return NextResponse.json({ error: "shift_date must be YYYY-MM-DD" }, { status: 400 });
  }

  const cashTips = toNumber(body.cash_tips);
  const cardTips = toNumber(body.card_tips);
  const hoursWorked = toNumber(body.hours_worked ?? body.hourly_wages);
  const dayOff = body.day_off === true;
  const note = dayOff ? DAY_OFF_NOTE : body.note ? String(body.note).trim() : null;

  if (!dayOff && cashTips <= 0 && cardTips <= 0 && hoursWorked <= 0) {
    return NextResponse.json({ error: "Add tips or hours before saving a shift." }, { status: 400 });
  }
  if (note && note.length > 500) {
    return NextResponse.json({ error: "note must be 500 characters or fewer." }, { status: 400 });
  }

  const payload = {
    user_id: user.id,
    shift_date: shiftDate,
    cash_tips: cashTips,
    card_tips: cardTips,
    hourly_wages: hoursWorked,
    note,
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
