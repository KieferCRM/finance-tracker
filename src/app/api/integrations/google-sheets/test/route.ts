import { NextResponse } from "next/server";
import { getAuthedSupabase } from "@/lib/api-auth";
import { syncEventToGoogleSheets } from "@/lib/integrations/google-sheets";

export async function POST() {
  const { user, response } = await getAuthedSupabase();
  if (!user) return response!;

  const webhookUrl = process.env.GOOGLE_SHEETS_WEBHOOK_URL;
  const webhookSecret = process.env.GOOGLE_SHEETS_WEBHOOK_SECRET;
  if (!webhookUrl || !webhookSecret) {
    return NextResponse.json(
      {
        error:
          "Google Sheets integration is not configured. Set GOOGLE_SHEETS_WEBHOOK_URL and GOOGLE_SHEETS_WEBHOOK_SECRET in .env.local.",
      },
      { status: 400 }
    );
  }

  try {
    await syncEventToGoogleSheets({
      event: "connection_test",
      user_id: user.id,
      note: "Manual connection test from TipTab",
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Google Sheets test failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
