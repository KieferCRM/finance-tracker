import { NextRequest, NextResponse } from "next/server";
import { getAuthedSupabase } from "@/lib/api-auth";
import { encryptToken } from "@/lib/bank/crypto";
import { plaidClient } from "@/lib/bank/plaid";
import { isProEnabled, PRO_UNDER_CONSTRUCTION_MESSAGE } from "@/lib/pro";

type ExchangeBody = {
  public_token?: string;
  institution_id?: string | null;
  institution_name?: string | null;
};

export async function POST(request: NextRequest) {
  const { supabase, user, response } = await getAuthedSupabase();
  if (!supabase || !user) return response!;
  if (!isProEnabled()) {
    return NextResponse.json({ error: PRO_UNDER_CONSTRUCTION_MESSAGE }, { status: 503 });
  }

  const body = (await request.json()) as ExchangeBody;
  const publicToken = String(body.public_token || "").trim();
  if (!publicToken) {
    return NextResponse.json({ error: "public_token is required" }, { status: 400 });
  }

  try {
    const client = plaidClient();
    const exchange = await client.itemPublicTokenExchange({ public_token: publicToken });

    const plaidItemId = exchange.data.item_id;
    const encryptedAccessToken = encryptToken(exchange.data.access_token);

    const { data: bankItem, error: bankItemError } = await supabase
      .from("bank_items")
      .upsert(
        {
          user_id: user.id,
          plaid_item_id: plaidItemId,
          access_token_encrypted: encryptedAccessToken,
          institution_id: body.institution_id ?? null,
          institution_name: body.institution_name ?? null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,plaid_item_id" }
      )
      .select("id")
      .single();

    if (bankItemError || !bankItem) {
      return NextResponse.json({ error: bankItemError?.message ?? "Failed to save item" }, { status: 400 });
    }

    const accountsRes = await client.accountsGet({ access_token: exchange.data.access_token });
    const accountRows = accountsRes.data.accounts.map((acct) => ({
      user_id: user.id,
      bank_item_id: bankItem.id,
      plaid_account_id: acct.account_id,
      name: acct.name,
      mask: acct.mask ?? null,
      account_type: acct.type ?? null,
      account_subtype: acct.subtype ?? null,
      current_balance: acct.balances.current ?? null,
      available_balance: acct.balances.available ?? null,
      iso_currency_code: acct.balances.iso_currency_code ?? null,
      updated_at: new Date().toISOString(),
    }));

    if (accountRows.length > 0) {
      const { error: accountError } = await supabase
        .from("bank_accounts")
        .upsert(accountRows, { onConflict: "user_id,plaid_account_id" });
      if (accountError) {
        return NextResponse.json({ error: accountError.message }, { status: 400 });
      }
    }

    return NextResponse.json({ ok: true, item_id: plaidItemId, accounts_connected: accountRows.length });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Token exchange failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
