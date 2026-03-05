import { NextRequest, NextResponse } from "next/server";
import { getAuthedSupabase } from "@/lib/api-auth";
import { buildMonthlyReport, ExpenseEntry, IncomeEntry } from "@/lib/reporting/metrics";
import { weekRangeFromParam } from "@/lib/reporting/week";

export async function GET(request: NextRequest) {
  const { supabase, user, response } = await getAuthedSupabase();
  if (!supabase || !user) return response!;

  const range = weekRangeFromParam(request.nextUrl.searchParams.get("date"));

  const [{ data: incomeRows, error: incomeErr }, { data: expenseRows, error: expenseErr }] = await Promise.all([
    supabase
      .from("income_entries")
      .select("id, shift_date, cash_tips, card_tips, hours_worked:hourly_wages, note, created_at")
      .eq("user_id", user.id)
      .gte("shift_date", range.startDate)
      .lte("shift_date", range.endDate),
    supabase
      .from("expense_entries")
      .select("id, expense_date, category, amount, note, created_at")
      .eq("user_id", user.id)
      .gte("expense_date", range.startDate)
      .lte("expense_date", range.endDate),
  ]);

  if (incomeErr) return NextResponse.json({ error: incomeErr.message }, { status: 400 });
  if (expenseErr) return NextResponse.json({ error: expenseErr.message }, { status: 400 });

  const report = buildMonthlyReport((incomeRows ?? []) as IncomeEntry[], (expenseRows ?? []) as ExpenseEntry[]);

  return NextResponse.json({
    date: range.date,
    range,
    report,
    counts: {
      incomes: incomeRows?.length ?? 0,
      expenses: expenseRows?.length ?? 0,
    },
  });
}
