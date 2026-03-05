import { NextRequest, NextResponse } from "next/server";
import { getAuthedSupabase } from "@/lib/api-auth";

type ImportFormat = "combined_export" | "income_sheet" | "expense_sheet";

type IncomeCandidate = {
  id?: string;
  shift_date: string;
  cash_tips: number;
  card_tips: number;
  hourly_wages: number;
  note: string | null;
};

type ExpenseCandidate = {
  id?: string;
  expense_date: string;
  category: string;
  amount: number;
  note: string | null;
};

function mapInsertError(message: string): string {
  if (message.includes("_user_id_fkey")) {
    return "Import failed because DEV_BYPASS_USER_ID is not a real Supabase auth user. Set DEV_BYPASS_USER_ID to a real user UUID or disable DEV_BYPASS_AUTH and log in.";
  }
  return message;
}

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let value = "";
  let i = 0;
  let inQuotes = false;

  while (i < text.length) {
    const char = text[i];

    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          value += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i += 1;
        continue;
      }
      value += char;
      i += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = true;
      i += 1;
      continue;
    }

    if (char === ",") {
      row.push(value);
      value = "";
      i += 1;
      continue;
    }

    if (char === "\n") {
      row.push(value);
      rows.push(row);
      row = [];
      value = "";
      i += 1;
      continue;
    }

    if (char === "\r") {
      i += 1;
      continue;
    }

    value += char;
    i += 1;
  }

  row.push(value);
  if (row.some((cell) => cell.trim() !== "")) {
    rows.push(row);
  }

  return rows;
}

function normalizeHeader(header: string): string {
  return header
    .replace(/^\uFEFF/, "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function toNumber(value: string | undefined): number {
  const num = Number((value ?? "").trim());
  if (!Number.isFinite(num)) return 0;
  return Math.max(0, num);
}

function toDate(value: string | undefined): string | null {
  const raw = (value ?? "").trim();
  if (!raw) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  if (/^\d{4}-\d{2}-\d{2}T/.test(raw)) return raw.slice(0, 10);
  return null;
}

function toUuid(value: string | undefined): string | undefined {
  const raw = (value ?? "").trim();
  if (!raw) return undefined;
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(raw)) {
    return raw;
  }
  return undefined;
}

function detectFormat(headers: string[]): ImportFormat | null {
  const has = (name: string) => headers.includes(name);
  if (has("type") && (has("date") || has("shift_date") || has("expense_date"))) {
    return "combined_export";
  }
  if (has("shift_date") && (has("cash_tips") || has("card_tips"))) {
    return "income_sheet";
  }
  if (has("expense_date") && has("amount")) {
    return "expense_sheet";
  }
  return null;
}

export async function POST(request: NextRequest) {
  const { supabase, user, response } = await getAuthedSupabase();
  if (!supabase || !user) return response!;

  const body = await request.json().catch(() => null);
  const csv = typeof body?.csv === "string" ? body.csv : "";
  if (!csv.trim()) {
    return NextResponse.json({ error: "CSV content is required." }, { status: 400 });
  }

  const parsed = parseCsv(csv);
  if (parsed.length < 2) {
    return NextResponse.json({ error: "CSV must include a header row and at least one data row." }, { status: 400 });
  }

  if (parsed.length > 10001) {
    return NextResponse.json({ error: "CSV is too large. Limit is 10,000 data rows per upload." }, { status: 400 });
  }

  const headers = parsed[0].map(normalizeHeader);
  const format = detectFormat(headers);
  if (!format) {
    return NextResponse.json(
      {
        error:
          "Unsupported CSV format. Use TipTab export CSV, Google Sheet income_entries CSV, or Google Sheet expense_entries CSV.",
      },
      { status: 400 }
    );
  }

  const incomeCandidates: IncomeCandidate[] = [];
  const expenseCandidates: ExpenseCandidate[] = [];
  let invalidRows = 0;
  let skippedRows = 0;

  for (let rowIndex = 1; rowIndex < parsed.length; rowIndex += 1) {
    const row = parsed[rowIndex];
    const record: Record<string, string> = {};
    headers.forEach((header, idx) => {
      record[header] = (row[idx] ?? "").trim();
    });

    const hasAnyValue = Object.values(record).some((value) => value !== "");
    if (!hasAnyValue) {
      skippedRows += 1;
      continue;
    }

    if (format === "combined_export") {
      const type = (record.type ?? "").toLowerCase();

      if (type === "income") {
        const shiftDate = toDate(record.shift_date || record.date);
        if (!shiftDate) {
          invalidRows += 1;
          continue;
        }
        const amountFallback = toNumber(record.amount);
        const cashTips = toNumber(record.cash_tips);
        const cardTips = toNumber(record.card_tips);
        const note = (record.note ?? "").trim() || null;

        incomeCandidates.push({
          id: toUuid(record.id || record.entry_id),
          shift_date: shiftDate,
          cash_tips: cashTips || cardTips ? cashTips : amountFallback,
          card_tips: cardTips,
          hourly_wages: toNumber(record.hours_worked || record.hourly_wages),
          note,
        });
        continue;
      }

      if (type === "expense") {
        const expenseDate = toDate(record.expense_date || record.date);
        const category = (record.category || record.category_or_context || "other").trim().toLowerCase();
        if (!expenseDate) {
          invalidRows += 1;
          continue;
        }
        expenseCandidates.push({
          id: toUuid(record.id || record.entry_id),
          expense_date: expenseDate,
          category: category || "other",
          amount: toNumber(record.amount),
          note: (record.note ?? "").trim() || null,
        });
        continue;
      }

      invalidRows += 1;
      continue;
    }

    if (format === "income_sheet") {
      const shiftDate = toDate(record.shift_date);
      if (!shiftDate) {
        invalidRows += 1;
        continue;
      }
      incomeCandidates.push({
        id: toUuid(record.id),
        shift_date: shiftDate,
        cash_tips: toNumber(record.cash_tips),
        card_tips: toNumber(record.card_tips),
        hourly_wages: toNumber(record.hours_worked || record.hourly_wages),
        note: (record.note ?? "").trim() || null,
      });
      continue;
    }

    const expenseDate = toDate(record.expense_date);
    if (!expenseDate) {
      invalidRows += 1;
      continue;
    }
    expenseCandidates.push({
      id: toUuid(record.id),
      expense_date: expenseDate,
      category: (record.category ?? "other").trim().toLowerCase() || "other",
      amount: toNumber(record.amount),
      note: (record.note ?? "").trim() || null,
    });
  }

  const incomeWithIdMap = new Map<string, IncomeCandidate>();
  const incomeNoId: IncomeCandidate[] = [];
  const incomeNoIdKeys = new Set<string>();
  for (const row of incomeCandidates) {
    if (row.id) {
      incomeWithIdMap.set(row.id, row);
      continue;
    }
    const key = [row.shift_date, row.cash_tips, row.card_tips, row.hourly_wages, row.note ?? ""].join("|");
    if (incomeNoIdKeys.has(key)) {
      skippedRows += 1;
      continue;
    }
    incomeNoIdKeys.add(key);
    incomeNoId.push(row);
  }

  const expenseWithIdMap = new Map<string, ExpenseCandidate>();
  const expenseNoId: ExpenseCandidate[] = [];
  const expenseNoIdKeys = new Set<string>();
  for (const row of expenseCandidates) {
    if (row.id) {
      expenseWithIdMap.set(row.id, row);
      continue;
    }
    const key = [row.expense_date, row.category, row.amount, row.note ?? ""].join("|");
    if (expenseNoIdKeys.has(key)) {
      skippedRows += 1;
      continue;
    }
    expenseNoIdKeys.add(key);
    expenseNoId.push(row);
  }

  const incomeWithId = Array.from(incomeWithIdMap.values()).map((row) => ({
    id: row.id!,
    user_id: user.id,
    shift_date: row.shift_date,
    cash_tips: row.cash_tips,
    card_tips: row.card_tips,
    hourly_wages: row.hourly_wages,
    note: row.note,
  }));
  const incomeWithoutId = incomeNoId.map((row) => ({
    user_id: user.id,
    shift_date: row.shift_date,
    cash_tips: row.cash_tips,
    card_tips: row.card_tips,
    hourly_wages: row.hourly_wages,
    note: row.note,
  }));

  const expenseWithId = Array.from(expenseWithIdMap.values()).map((row) => ({
    id: row.id!,
    user_id: user.id,
    expense_date: row.expense_date,
    category: row.category,
    amount: row.amount,
    note: row.note,
  }));
  const expenseWithoutId = expenseNoId.map((row) => ({
    user_id: user.id,
    expense_date: row.expense_date,
    category: row.category,
    amount: row.amount,
    note: row.note,
  }));

  let importedIncome = 0;
  let importedExpense = 0;

  if (incomeWithId.length > 0) {
    const { data, error } = await supabase
      .from("income_entries")
      .upsert(incomeWithId, { onConflict: "id", ignoreDuplicates: true })
      .select("id");
    if (error) return NextResponse.json({ error: mapInsertError(error.message) }, { status: 400 });
    importedIncome += data?.length ?? 0;
  }

  if (incomeWithoutId.length > 0) {
    const { data, error } = await supabase.from("income_entries").insert(incomeWithoutId).select("id");
    if (error) return NextResponse.json({ error: mapInsertError(error.message) }, { status: 400 });
    importedIncome += data?.length ?? 0;
  }

  if (expenseWithId.length > 0) {
    const { data, error } = await supabase
      .from("expense_entries")
      .upsert(expenseWithId, { onConflict: "id", ignoreDuplicates: true })
      .select("id");
    if (error) return NextResponse.json({ error: mapInsertError(error.message) }, { status: 400 });
    importedExpense += data?.length ?? 0;
  }

  if (expenseWithoutId.length > 0) {
    const { data, error } = await supabase.from("expense_entries").insert(expenseWithoutId).select("id");
    if (error) return NextResponse.json({ error: mapInsertError(error.message) }, { status: 400 });
    importedExpense += data?.length ?? 0;
  }

  return NextResponse.json({
    ok: true,
    format,
    imported_income: importedIncome,
    imported_expense: importedExpense,
    skipped_rows: skippedRows,
    invalid_rows: invalidRows,
  });
}
