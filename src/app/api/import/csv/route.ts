import { NextRequest, NextResponse } from "next/server";
import { getAuthedSupabase } from "@/lib/api-auth";

type ImportFormat = "combined_export" | "income_sheet" | "expense_sheet" | "serverlife_shift";

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

const SERVERLIFE_DATE_FIELDS = ["date", "shift_date", "work_date", "day"];
const SERVERLIFE_TAKE_HOME_FIELDS = ["take_home", "takehome", "net", "net_tips", "total_tips", "tips", "earnings", "income"];
const SERVERLIFE_HOURS_FIELDS = ["hours", "hours_worked", "shift_hours", "worked_hours"];
const SERVERLIFE_CASH_FIELDS = ["cash_tips", "cash", "cash_tip"];
const SERVERLIFE_CARD_FIELDS = ["card_tips", "credit_tips", "card", "credit"];
const SERVERLIFE_NOTE_FIELDS = ["note", "notes", "job", "venue", "location", "shift"];

function mapInsertError(message: string): string {
  if (message.includes("_user_id_fkey")) {
    return "Import failed because DEV_BYPASS_USER_ID is not a real Supabase auth user. Set DEV_BYPASS_USER_ID to a real user UUID or disable DEV_BYPASS_AUTH and log in.";
  }
  return message;
}

const CSV_DELIMITERS = [",", ";", "\t", "|"] as const;

function parseCsvWithDelimiter(text: string, delimiter: string): string[][] {
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

    if (char === delimiter) {
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

function normalizeCsvText(text: string): { content: string; hintedDelimiter: string | null } {
  const withoutBom = text.replace(/^\uFEFF/, "");
  const normalized = withoutBom.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const lines = normalized.split("\n");

  const firstNonEmptyIdx = lines.findIndex((line) => line.trim() !== "");
  if (firstNonEmptyIdx === -1) return { content: "", hintedDelimiter: null };

  const firstNonEmpty = lines[firstNonEmptyIdx].trim();
  const separatorMatch = firstNonEmpty.match(/^sep=(.)$/i);
  if (separatorMatch) {
    const hintedDelimiter = separatorMatch[1];
    lines.splice(firstNonEmptyIdx, 1);
    return { content: lines.join("\n"), hintedDelimiter };
  }

  return { content: normalized, hintedDelimiter: null };
}

function parseCsv(text: string): string[][] {
  const { content, hintedDelimiter } = normalizeCsvText(text);
  if (!content.trim()) return [];

  const delimiters = hintedDelimiter
    ? [hintedDelimiter, ...CSV_DELIMITERS.filter((delimiter) => delimiter !== hintedDelimiter)]
    : [...CSV_DELIMITERS];

  let bestRows: string[][] = [];
  let bestScore = -Infinity;

  for (const delimiter of delimiters) {
    const parsed = parseCsvWithDelimiter(content, delimiter);
    if (parsed.length === 0) continue;

    const headerWidth = parsed[0]?.length ?? 0;
    const dataRows = Math.max(0, parsed.length - 1);
    const sampleWidths = parsed.slice(0, 12).map((row) => row.length);
    const maxWidth = sampleWidths.length > 0 ? Math.max(...sampleWidths) : 0;
    const minWidth = sampleWidths.length > 0 ? Math.min(...sampleWidths) : 0;
    const consistencyPenalty = Math.max(0, maxWidth - minWidth);

    const score = (headerWidth > 1 ? 1000 : 0) + headerWidth * 10 + dataRows - consistencyPenalty * 5;
    if (score > bestScore) {
      bestScore = score;
      bestRows = parsed;
    }
  }

  return bestRows;
}

function normalizeHeader(header: string): string {
  return header
    .replace(/^\uFEFF/, "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function parseSignedNumber(value: string | undefined): number | null {
  const raw = (value ?? "").trim();
  if (!raw) return null;

  const isParenNegative = raw.startsWith("(") && raw.endsWith(")");
  const cleaned = raw
    .replace(/[,$]/g, "")
    .replace(/^\((.*)\)$/, "$1")
    .replace(/\s+/g, "");

  const num = Number(cleaned);
  if (!Number.isFinite(num)) return null;
  const signed = isParenNegative ? -Math.abs(num) : num;
  return signed;
}

function toNumber(value: string | undefined): number {
  const signed = parseSignedNumber(value);
  if (signed === null) return 0;
  return Math.abs(signed);
}

function toDate(value: string | undefined): string | null {
  const raw = (value ?? "").trim();
  if (!raw) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  if (/^\d{4}-\d{2}-\d{2}T/.test(raw)) return raw.slice(0, 10);

  const slashOrDash = raw.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})(?:\s|T|$)/);
  if (slashOrDash) {
    const month = Number(slashOrDash[1]);
    const day = Number(slashOrDash[2]);
    const year = Number(slashOrDash[3]);
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      const iso = `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      const probe = new Date(`${iso}T00:00:00.000Z`);
      if (!Number.isNaN(probe.getTime()) && probe.toISOString().slice(0, 10) === iso) {
        return iso;
      }
    }
  }

  const serial = Number(raw);
  if (Number.isFinite(serial) && serial > 20000 && serial < 100000) {
    const excelEpochUtc = Date.UTC(1899, 11, 30);
    const millis = excelEpochUtc + Math.floor(serial) * 24 * 60 * 60 * 1000;
    const serialDate = new Date(millis);
    if (!Number.isNaN(serialDate.getTime())) {
      return serialDate.toISOString().slice(0, 10);
    }
  }

  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }

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

function hasAnyHeader(headers: string[], candidates: string[]): boolean {
  return candidates.some((name) => headers.includes(name));
}

function firstNonEmpty(record: Record<string, string>, candidates: string[]): string | undefined {
  for (const name of candidates) {
    const value = (record[name] ?? "").trim();
    if (value) return value;
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
  if (hasAnyHeader(headers, SERVERLIFE_DATE_FIELDS) && (hasAnyHeader(headers, SERVERLIFE_TAKE_HOME_FIELDS) || hasAnyHeader(headers, SERVERLIFE_HOURS_FIELDS))) {
    return "serverlife_shift";
  }
  return null;
}

function normalizeToken(value: string | undefined): string {
  return (value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function normalizeCombinedType(value: string | undefined): "income" | "expense" | null {
  const token = normalizeToken(value);
  if (!token) return null;
  if (token.includes("income") || token.includes("earning") || token.includes("tip")) return "income";
  if (token.includes("expense") || token.includes("spend") || token.includes("purchase") || token.includes("bill")) return "expense";

  const incomeTokens = new Set([
    "income",
    "in",
    "credit",
    "cash_in",
    "inflow",
    "deposit",
    "earning",
    "earnings",
    "tip",
    "tips",
  ]);
  const expenseTokens = new Set([
    "expense",
    "out",
    "debit",
    "cash_out",
    "outflow",
    "spend",
    "spending",
    "purchase",
    "withdrawal",
    "bill",
  ]);
  if (incomeTokens.has(token)) return "income";
  if (expenseTokens.has(token)) return "expense";
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

  const parsedRows = parseCsv(csv);
  if (parsedRows.length < 2) {
    return NextResponse.json(
      {
        error: "CSV must include a header row and at least one data row. If this is a ServerLife export, make sure you uploaded a .csv file (not .xlsx) and re-export with full shift rows.",
      },
      { status: 400 }
    );
  }

  if (parsedRows.length > 10001) {
    return NextResponse.json({ error: "CSV is too large. Limit is 10,000 data rows per upload." }, { status: 400 });
  }

  let headerRowIndex = 0;
  let detectedFormat: ImportFormat | null = null;
  const maxHeaderScan = Math.min(parsedRows.length - 1, 25);
  for (let i = 0; i < maxHeaderScan; i += 1) {
    const candidateHeaders = parsedRows[i].map(normalizeHeader);
    const candidateFormat = detectFormat(candidateHeaders);
    if (!candidateFormat) continue;
    const hasDataAfter = parsedRows.slice(i + 1).some((row) => row.some((cell) => cell.trim() !== ""));
    if (!hasDataAfter) continue;
    headerRowIndex = i;
    detectedFormat = candidateFormat;
    break;
  }

  const parsed = parsedRows.slice(headerRowIndex);
  if (parsed.length < 2) {
    return NextResponse.json(
      {
        error: "CSV must include a header row and at least one data row. If this is a ServerLife export, make sure you uploaded a .csv file (not .xlsx) and re-export with full shift rows.",
      },
      { status: 400 }
    );
  }

  const headers = parsed[0].map(normalizeHeader);
  const format = detectedFormat ?? detectFormat(headers);
  if (!format) {
    return NextResponse.json(
      {
        error:
          "Unsupported CSV format. Use TipTapped export CSV, Google Sheet income_entries CSV, Google Sheet expense_entries CSV, or ServerLife CSV with date/take-home/hours columns.",
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
      const amountSigned = parseSignedNumber(record.amount);
      const inferredType =
        normalizeCombinedType(record.type) ??
        (record.shift_date || record.cash_tips || record.card_tips ? "income" : null) ??
        (record.expense_date || record.category || record.category_or_context ? "expense" : null) ??
        (typeof amountSigned === "number" && amountSigned < 0 ? "expense" : null) ??
        (typeof amountSigned === "number" && amountSigned > 0 ? "income" : null);
      const type = inferredType;

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
          amount: amountSigned !== null ? Math.abs(amountSigned) : toNumber(record.amount),
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

    if (format === "serverlife_shift") {
      const shiftDate = toDate(firstNonEmpty(record, SERVERLIFE_DATE_FIELDS));
      if (!shiftDate) {
        skippedRows += 1;
        continue;
      }

      const cashTips = toNumber(firstNonEmpty(record, SERVERLIFE_CASH_FIELDS));
      const cardTips = toNumber(firstNonEmpty(record, SERVERLIFE_CARD_FIELDS));
      const takeHome = toNumber(firstNonEmpty(record, SERVERLIFE_TAKE_HOME_FIELDS));
      const hoursWorked = toNumber(firstNonEmpty(record, SERVERLIFE_HOURS_FIELDS));
      const note = firstNonEmpty(record, SERVERLIFE_NOTE_FIELDS) ?? null;

      const hasTipsBreakdown = cashTips > 0 || cardTips > 0;
      const mappedCashTips = hasTipsBreakdown ? cashTips : takeHome;
      const mappedCardTips = hasTipsBreakdown ? cardTips : 0;

      if (mappedCashTips <= 0 && mappedCardTips <= 0 && hoursWorked <= 0 && !note) {
        skippedRows += 1;
        continue;
      }

      incomeCandidates.push({
        id: toUuid(record.id || record.entry_id),
        shift_date: shiftDate,
        cash_tips: mappedCashTips,
        card_tips: mappedCardTips,
        hourly_wages: hoursWorked,
        note,
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
