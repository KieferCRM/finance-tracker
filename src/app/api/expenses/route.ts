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
    .from("expense_entries")
    .select("id, expense_date, category, amount, note, created_at")
    .eq("user_id", user.id)
    .order("expense_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit);

  if (month) {
    const range = monthRangeFromParam(month);
    query = query.gte("expense_date", range.startDate).lte("expense_date", range.endDate);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ rows: data ?? [] });
}

export async function POST(request: NextRequest) {
  const { supabase, user, response } = await getAuthedSupabase();
  if (!supabase || !user) return response!;

  const body = await request.json();
  const expenseDate = String(body.expense_date ?? "").trim();
  const category = String(body.category ?? "").trim().toLowerCase();

  if (!/^\d{4}-\d{2}-\d{2}$/.test(expenseDate)) {
    return NextResponse.json({ error: "expense_date must be YYYY-MM-DD" }, { status: 400 });
  }
  if (!category) {
    return NextResponse.json({ error: "category is required" }, { status: 400 });
  }

  const payload = {
    user_id: user.id,
    expense_date: expenseDate,
    category,
    amount: toNumber(body.amount),
    note: body.note ? String(body.note).trim() : null,
  };

  const { data, error } = await supabase
    .from("expense_entries")
    .insert(payload)
    .select("id, expense_date, category, amount, note, created_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  void syncEventToGoogleSheets({
    event: "expense_created",
    user_id: user.id,
    row: data,
  }).catch((syncError) => {
    console.error("Google Sheets sync failed (expense):", syncError);
  });

  return NextResponse.json({ row: data }, { status: 201 });
}
