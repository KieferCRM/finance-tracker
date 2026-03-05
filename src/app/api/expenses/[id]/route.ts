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
  if (body.expense_date !== undefined) {
    const expenseDate = String(body.expense_date).trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(expenseDate)) {
      return NextResponse.json({ error: "expense_date must be YYYY-MM-DD" }, { status: 400 });
    }
    updates.expense_date = expenseDate;
  }
  if (body.category !== undefined) updates.category = String(body.category || "").trim().toLowerCase();
  if (body.amount !== undefined) updates.amount = toNumber(body.amount);
  if (body.note !== undefined) updates.note = body.note ? String(body.note).trim() : null;

  const { data, error } = await supabase
    .from("expense_entries")
    .update(updates)
    .eq("id", id)
    .eq("user_id", user.id)
    .select("id, expense_date, category, amount, note, created_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ row: data });
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { supabase, user, response } = await getAuthedSupabase();
  if (!supabase || !user) return response!;

  const { id } = await params;
  const { error } = await supabase.from("expense_entries").delete().eq("id", id).eq("user_id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ ok: true });
}
