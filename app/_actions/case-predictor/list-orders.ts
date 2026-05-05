"use server";

import { getCallerClient } from "@socios-ai/auth/admin";
import { getCallerJwt } from "@/lib/auth";

export type CasePredictorOrder = {
  id: string;
  user_id: string | null;
  case_predictor_lead_id: string | null;
  partner_id_attribution: string | null;
  price_amount_cents: number;
  discount_amount_cents: number;
  net_amount_cents: number;
  status: string;
  payment_method: string | null;
  created_at: string;
  paid_at: string | null;
  notes: string | null;
};

export type ListCasePredictorOrdersResult =
  | { ok: true; rows: CasePredictorOrder[]; total: number }
  | { ok: false; error: "FORBIDDEN" | "DB_ERROR"; message: string };

export async function listCasePredictorOrders(args: {
  limit?: number;
  offset?: number;
  status?: string;
  partner_id_attribution?: string;
}): Promise<ListCasePredictorOrdersResult> {
  const jwt = await getCallerJwt();
  if (!jwt) {
    return { ok: false, error: "FORBIDDEN", message: "Sessão inválida" };
  }

  const limit = Math.min(Math.max(args.limit ?? 50, 1), 200);
  const offset = Math.max(args.offset ?? 0, 0);

  const sb = getCallerClient({ callerJwt: jwt });
  let query = sb
    .from("case_predictor_orders")
    .select(
      "id,user_id,case_predictor_lead_id,partner_id_attribution,price_amount_cents,discount_amount_cents,net_amount_cents,status,payment_method,created_at,paid_at,notes",
      { count: "exact" },
    );

  if (args.status) query = query.eq("status", args.status);
  if (args.partner_id_attribution) query = query.eq("partner_id_attribution", args.partner_id_attribution);

  const { data, error, count } = await query
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);
  if (error) {
    return { ok: false, error: "DB_ERROR", message: error.message };
  }

  return { ok: true, rows: (data ?? []) as CasePredictorOrder[], total: count ?? 0 };
}
