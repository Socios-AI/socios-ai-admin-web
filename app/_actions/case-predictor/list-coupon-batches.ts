"use server";

import { getCallerClient } from "@socios-ai/auth/admin";
import { getCallerJwt } from "@/lib/auth";

export type CouponBatch = {
  id: string;
  partner_id: string;
  total_count: number;
  discount_pct: number;
  valid_until: string | null;
  payment_status: string;
  created_at: string;
};

export type ListBatchesResult =
  | { ok: true; rows: CouponBatch[]; total: number }
  | { ok: false; error: "FORBIDDEN" | "DB_ERROR"; message: string };

export async function listCasePredictorCouponBatches(args: {
  limit?: number;
  offset?: number;
}): Promise<ListBatchesResult> {
  const jwt = await getCallerJwt();
  if (!jwt) {
    return { ok: false, error: "FORBIDDEN", message: "Sessão inválida" };
  }

  const limit = Math.min(Math.max(args.limit ?? 50, 1), 200);
  const offset = Math.max(args.offset ?? 0, 0);

  const sb = getCallerClient({ callerJwt: jwt });
  const { data, error, count } = await sb
    .from("case_predictor_coupon_batches")
    .select("id,partner_id,total_count,discount_pct,valid_until,payment_status,created_at", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) return { ok: false, error: "DB_ERROR", message: error.message };
  return { ok: true, rows: (data ?? []) as CouponBatch[], total: count ?? 0 };
}
