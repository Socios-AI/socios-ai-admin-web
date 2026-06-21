"use server";

import { getCallerClient } from "@socios-ai/auth/admin";
import { requireRegistrarOrAdminAAL2 } from "@/lib/auth";

export type PartnerSearchRow = {
  partnerId: string;
  label: string;
  role: string;
  status: string;
};

export type SearchPartnersResult =
  | { ok: true; partners: PartnerSearchRow[] }
  | { ok: false; error: "FORBIDDEN" | "API_ERROR"; message?: string };

export async function searchPartnersAction(query: string): Promise<SearchPartnersResult> {
  const auth = await requireRegistrarOrAdminAAL2();
  if (!auth) return { ok: false, error: "FORBIDDEN" };

  const q = (query ?? "").trim();
  if (q.length < 2) return { ok: true, partners: [] };

  const sb = getCallerClient({ callerJwt: auth.jwt });
  const { data, error } = await sb.rpc("admin_search_partners", { p_query: q });
  if (error) {
    if (error.code === "42501") return { ok: false, error: "FORBIDDEN" };
    return { ok: false, error: "API_ERROR", message: error.message };
  }

  const rows = Array.isArray(data) ? data : [];
  const partners: PartnerSearchRow[] = rows.map((r: Record<string, unknown>) => ({
    partnerId: String(r.partner_id),
    label: String(r.label ?? ""),
    role: String(r.role ?? ""),
    status: String(r.status ?? ""),
  }));
  return { ok: true, partners };
}
