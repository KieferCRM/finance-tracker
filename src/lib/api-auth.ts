import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export async function getAuthedSupabase() {
  const supabase = await supabaseServer();
  if (process.env.DEV_BYPASS_AUTH === "true") {
    return {
      supabase,
      user: { id: process.env.DEV_BYPASS_USER_ID ?? "00000000-0000-0000-0000-000000000000" } as any,
      response: null,
    };
  }

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return {
      supabase: null,
      user: null,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  return {
    supabase,
    user,
    response: null,
  };
}
