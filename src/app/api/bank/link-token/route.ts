import { NextResponse } from "next/server";
import { CountryCode, Products } from "plaid";
import { getAuthedSupabase } from "@/lib/api-auth";
import { plaidClient } from "@/lib/bank/plaid";
import { isProEnabled, PRO_UNDER_CONSTRUCTION_MESSAGE } from "@/lib/pro";

export async function POST() {
  const { user, response } = await getAuthedSupabase();
  if (!user) return response!;
  if (!isProEnabled()) {
    return NextResponse.json({ error: PRO_UNDER_CONSTRUCTION_MESSAGE }, { status: 503 });
  }

  try {
    const client = plaidClient();
    const tokenRes = await client.linkTokenCreate({
      user: { client_user_id: user.id },
      client_name: "TipTapped",
      products: [Products.Transactions],
      language: "en",
      country_codes: [CountryCode.Us],
      webhook: process.env.PLAID_WEBHOOK_URL || undefined,
    });

    return NextResponse.json({
      link_token: tokenRes.data.link_token,
      expiration: tokenRes.data.expiration,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create link token";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
