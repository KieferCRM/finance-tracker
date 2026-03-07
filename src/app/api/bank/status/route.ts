import { NextResponse } from "next/server";
import { getAuthedSupabase } from "@/lib/api-auth";
import { isProEnabled } from "@/lib/pro";

type BankItem = {
  id: string;
  plaid_item_id: string;
  institution_name: string | null;
  created_at: string;
};

type BankAccount = {
  id: string;
  bank_item_id: string;
  name: string;
  mask: string | null;
  account_subtype: string | null;
  current_balance: number | null;
};

type BankTransaction = {
  id: string;
  transaction_date: string | null;
  name: string | null;
  amount: number;
  pending: boolean;
  removed_at: string | null;
};

export async function GET() {
  const { supabase, user, response } = await getAuthedSupabase();
  if (!supabase || !user) return response!;
  const proEnabled = isProEnabled();

  const [{ data: items }, { data: accounts }, { data: txs }] = await Promise.all([
    supabase
      .from("bank_items")
      .select("id, plaid_item_id, institution_name, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("bank_accounts")
      .select("id, bank_item_id, name, mask, account_subtype, current_balance")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("bank_transactions")
      .select("id, transaction_date, name, amount, pending, removed_at")
      .eq("user_id", user.id)
      .is("removed_at", null)
      .order("transaction_date", { ascending: false })
      .limit(12),
  ]);

  return NextResponse.json({
    pro_enabled: proEnabled,
    items: (items ?? []) as BankItem[],
    accounts: (accounts ?? []) as BankAccount[],
    recent_transactions: (txs ?? []) as BankTransaction[],
  });
}
