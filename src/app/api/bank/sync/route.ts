import { NextRequest, NextResponse } from "next/server";
import { getAuthedSupabase } from "@/lib/api-auth";
import { decryptToken } from "@/lib/bank/crypto";
import { plaidClient } from "@/lib/bank/plaid";

type SyncBody = {
  plaid_item_id?: string;
};

type BankItemRow = {
  id: string;
  plaid_item_id: string;
  access_token_encrypted: string;
  last_cursor: string | null;
};

type BankAccountRow = {
  id: string;
  plaid_account_id: string;
};

export async function POST(request: NextRequest) {
  const { supabase, user, response } = await getAuthedSupabase();
  if (!supabase || !user) return response!;

  const body = (await request.json().catch(() => ({}))) as SyncBody;

  let itemsQuery = supabase
    .from("bank_items")
    .select("id, plaid_item_id, access_token_encrypted, last_cursor")
    .eq("user_id", user.id);

  if (body.plaid_item_id) {
    itemsQuery = itemsQuery.eq("plaid_item_id", body.plaid_item_id);
  }

  const { data: items, error: itemsError } = await itemsQuery;
  if (itemsError) {
    return NextResponse.json({ error: itemsError.message }, { status: 400 });
  }
  if (!items || items.length === 0) {
    return NextResponse.json({ ok: true, synced_items: 0, added: 0, modified: 0, removed: 0 });
  }

  const client = plaidClient();

  let addedTotal = 0;
  let modifiedTotal = 0;
  let removedTotal = 0;

  for (const item of items as BankItemRow[]) {
    const accessToken = decryptToken(item.access_token_encrypted);

    const { data: accountRows } = await supabase
      .from("bank_accounts")
      .select("id, plaid_account_id")
      .eq("user_id", user.id)
      .eq("bank_item_id", item.id);

    const accountByPlaidId = new Map<string, string>();
    for (const account of (accountRows ?? []) as BankAccountRow[]) {
      accountByPlaidId.set(account.plaid_account_id, account.id);
    }

    let cursor = item.last_cursor || undefined;
    let hasMore = true;

    while (hasMore) {
      const syncRes = await client.transactionsSync({
        access_token: accessToken,
        cursor,
        count: 200,
      });

      const added = syncRes.data.added ?? [];
      const modified = syncRes.data.modified ?? [];
      const removed = syncRes.data.removed ?? [];

      const upsertRows = [...added, ...modified].map((tx) => ({
        user_id: user.id,
        bank_item_id: item.id,
        bank_account_id: accountByPlaidId.get(tx.account_id) ?? null,
        plaid_transaction_id: tx.transaction_id,
        amount: tx.amount,
        iso_currency_code: tx.iso_currency_code ?? tx.unofficial_currency_code ?? null,
        transaction_date: tx.date ?? tx.authorized_date ?? null,
        name: tx.name ?? null,
        merchant_name: tx.merchant_name ?? null,
        category_primary: tx.personal_finance_category?.primary ?? null,
        pending: tx.pending ?? false,
        removed_at: null,
        raw: tx,
        updated_at: new Date().toISOString(),
      }));

      if (upsertRows.length > 0) {
        const { error: upsertError } = await supabase
          .from("bank_transactions")
          .upsert(upsertRows, { onConflict: "user_id,plaid_transaction_id" });
        if (upsertError) {
          return NextResponse.json({ error: upsertError.message }, { status: 400 });
        }
      }

      if (removed.length > 0) {
        const removedIds = removed.map((tx) => tx.transaction_id);
        const { error: removeError } = await supabase
          .from("bank_transactions")
          .update({ removed_at: new Date().toISOString(), updated_at: new Date().toISOString() })
          .eq("user_id", user.id)
          .in("plaid_transaction_id", removedIds);
        if (removeError) {
          return NextResponse.json({ error: removeError.message }, { status: 400 });
        }
      }

      addedTotal += added.length;
      modifiedTotal += modified.length;
      removedTotal += removed.length;

      cursor = syncRes.data.next_cursor;
      hasMore = syncRes.data.has_more;
    }

    const { error: cursorError } = await supabase
      .from("bank_items")
      .update({ last_cursor: cursor ?? null, updated_at: new Date().toISOString() })
      .eq("id", item.id)
      .eq("user_id", user.id);

    if (cursorError) {
      return NextResponse.json({ error: cursorError.message }, { status: 400 });
    }
  }

  return NextResponse.json({
    ok: true,
    synced_items: items.length,
    added: addedTotal,
    modified: modifiedTotal,
    removed: removedTotal,
  });
}
