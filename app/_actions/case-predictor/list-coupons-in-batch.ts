"use server";

import { getCallerClient } from "@socios-ai/auth/admin";
import { getCallerJwt } from "@/lib/auth";

export type Coupon = {
  id: string;
  batch_id: string;
  code: string;
  status: string;
  redeemed_by_user_id: string | null;
  redeemed_at: string | null;
  order_id: string | null;
};

export type ListCouponsResult =
  | { ok: true; rows: Coupon[] }
  | { ok: false; error: "FORBIDDEN" | "DB_ERROR"; message: string };

export async function listCouponsInBatch(batchId: string): Promise<ListCouponsResult> {
  const jwt = await getCallerJwt();
  if (!jwt) {
    return { ok: false, error: "FORBIDDEN", message: "Sessão inválida" };
  }

  const sb = getCallerClient({ callerJwt: jwt });
  const { data, error } = await sb
    .from("case_predictor_coupons")
    .select("id,batch_id,code,status,redeemed_by_user_id,redeemed_at,order_id")
    .eq("batch_id", batchId)
    .order("created_at", { ascending: true });

  if (error) return { ok: false, error: "DB_ERROR", message: error.message };
  return { ok: true, rows: (data ?? []) as Coupon[] };
}
