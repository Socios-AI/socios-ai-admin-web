"use server";

import { getSupabaseAdminClient } from "@socios-ai/auth/admin";
import { requireRegistrarOrAdminAAL2 } from "@/lib/auth";
import { z } from "zod";

const schema = z.object({
  orgId: z.string().uuid("org inválida"),
  name: z.string().trim().min(2, "Nome muito curto").max(200, "Nome muito longo"),
});

export type UpdateOrgResult =
  | { ok: true }
  | { ok: false; error: "FORBIDDEN" | "VALIDATION" | "API_ERROR"; message?: string };

// Edição do nome do cliente (org). RLS de orgs bloqueia UPDATE pra authenticated,
// então usamos service-role; o gate é requireRegistrarOrAdminAAL2 (super_admin OU
// cadastrador, ambos com AAL2). Só edita o nome (campo não-financeiro). O slug é
// interno (auto-gerado) e não é editável aqui.
export async function updateOrgAction(input: unknown): Promise<UpdateOrgResult> {
  const auth = await requireRegistrarOrAdminAAL2();
  if (!auth) return { ok: false, error: "FORBIDDEN" };

  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "VALIDATION", message: parsed.error.issues[0]?.message };
  }
  const { orgId, name } = parsed.data;

  const sb = getSupabaseAdminClient();
  const { error } = await sb.from("orgs").update({ name }).eq("id", orgId);
  if (error) return { ok: false, error: "API_ERROR", message: error.message };

  return { ok: true };
}
