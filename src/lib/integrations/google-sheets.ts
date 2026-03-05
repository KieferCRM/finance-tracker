type IncomeSheetRow = {
  id: string;
  shift_date: string;
  cash_tips: number;
  card_tips: number;
  hours_worked: number;
  note: string | null;
  created_at: string;
};

type ExpenseSheetRow = {
  id: string;
  expense_date: string;
  category: string;
  amount: number;
  note: string | null;
  created_at: string;
};

type SheetEvent =
  | { event: "income_created"; user_id: string; row: IncomeSheetRow }
  | { event: "expense_created"; user_id: string; row: ExpenseSheetRow }
  | { event: "connection_test"; user_id: string; note: string };

export async function syncEventToGoogleSheets(event: SheetEvent): Promise<void> {
  const webhookUrl = process.env.GOOGLE_SHEETS_WEBHOOK_URL;
  if (!webhookUrl) return;

  const secret = process.env.GOOGLE_SHEETS_WEBHOOK_SECRET;

  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(secret ? { "x-tiptab-secret": secret } : {}),
    },
    body: JSON.stringify({
      source: "tiptab",
      occurred_at: new Date().toISOString(),
      webhook_secret: secret ?? null,
      ...event,
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Google Sheets webhook failed (${response.status}): ${text || response.statusText}`);
  }
}
