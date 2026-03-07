import { NextRequest, NextResponse } from "next/server";
import { getAuthedSupabase } from "@/lib/api-auth";
import { monthRangeFromParam } from "@/lib/reporting/month";
import { isDayOffEntry } from "@/lib/calendar";

function csvEscape(value: string | number | null | undefined): string {
  const raw = value === null || value === undefined ? "" : String(value);
  return `"${raw.replaceAll('"', '""')}"`;
}

export async function GET(request: NextRequest) {
  const { supabase, user, response } = await getAuthedSupabase();
  if (!supabase || !user) return response!;

  const range = monthRangeFromParam(request.nextUrl.searchParams.get("month"));

  const [{ data: incomeRows, error: incomeErr }, { data: expenseRows, error: expenseErr }] = await Promise.all([
    supabase
      .from("income_entries")
      .select("id, shift_date, cash_tips, card_tips, hours_worked:hourly_wages, note")
      .eq("user_id", user.id)
      .gte("shift_date", range.startDate)
      .lte("shift_date", range.endDate)
      .order("shift_date", { ascending: true }),
    supabase
      .from("expense_entries")
      .select("id, expense_date, category, amount, note")
      .eq("user_id", user.id)
      .gte("expense_date", range.startDate)
      .lte("expense_date", range.endDate)
      .order("expense_date", { ascending: true }),
  ]);

  if (incomeErr) return NextResponse.json({ error: incomeErr.message }, { status: 400 });
  if (expenseErr) return NextResponse.json({ error: expenseErr.message }, { status: 400 });

  const lines: string[] = [
    ["type", "date", "category_or_context", "amount", "cash_tips", "card_tips", "hours_worked", "note", "entry_id"].join(","),
  ];

  for (const row of incomeRows ?? []) {
    if (isDayOffEntry(row)) continue;
    lines.push(
      [
        csvEscape("income"),
        csvEscape(row.shift_date),
        csvEscape("shift"),
        csvEscape((Number(row.cash_tips) + Number(row.card_tips)).toFixed(2)),
        csvEscape(Number(row.cash_tips).toFixed(2)),
        csvEscape(Number(row.card_tips).toFixed(2)),
        csvEscape(Number(row.hours_worked).toFixed(2)),
        csvEscape(row.note),
        csvEscape(row.id),
      ].join(",")
    );
  }

  for (const row of expenseRows ?? []) {
    lines.push(
      [
        csvEscape("expense"),
        csvEscape(row.expense_date),
        csvEscape(row.category),
        csvEscape(Number(row.amount).toFixed(2)),
        csvEscape(""),
        csvEscape(""),
        csvEscape(""),
        csvEscape(row.note),
        csvEscape(row.id),
      ].join(",")
    );
  }

  return new NextResponse(`${lines.join("\n")}\n`, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="tiptap-${range.month}.csv"`,
    },
  });
}
