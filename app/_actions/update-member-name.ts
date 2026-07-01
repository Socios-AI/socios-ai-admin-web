"use server";

import { getSupabaseAdminClient } from "@socios-ai/auth/admin";
import { requireRegistrarOrAdminAAL2 } from "@/lib/auth";
import { z } from "zod";

const schema = z.object({
  userId: z.string().uuid("usuário inválido"),
  name: z.string().trim().min(2, "Nome muito curto").max(100, "Nome muito longo"),
});

export type UpdateMemberNameResult =
  | { ok: true }
  | { ok: false; error: "FORBIDDEN" | "VALIDATION" | "API_ERROR"; message?: string };

// Edita o nome (profiles.full_name) de um membro/dono de organização. RLS de
// profiles bloqueia UPDATE pra authenticated → service-role; o gate é
// requireRegistrarOrAdminAAL2 (super_admin OU cadastrador, ambos AAL2).
//
// Firewall (mesma filosofia curada de data-registrar): o alvo PRECISA ser membro
// ativo de alguma org (não um usuário qualquer) e NUNCA pode ser super_admin.
// Só toca o nome · nada financeiro.
export async function updateMemberNameAction(input: unknown): Promise<UpdateMemberNameResult> {
  const auth = await requireRegistrarOrAdminAAL2();
  if (!auth) return { ok: false, error: "FORBIDDEN" };

  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "VALIDATION", message: parsed.error.issues[0]?.message };
  }
  const { userId, name } = parsed.data;

  const sb = getSupabaseAdminClient();

  // O alvo tem que ser membro ativo de uma org.
  const { data: membership, error: memErr } = await sb
    .from("app_memberships")
    .select("user_id")
    .eq("user_id", userId)
    .not("org_id", "is", null)
    .is("revoked_at", null)
    .limit(1)
    .maybeSingle();
  if (memErr) return { ok: false, error: "API_ERROR", message: memErr.message };
  if (!membership) {
    return { ok: false, error: "FORBIDDEN", message: "usuário não é membro de uma organização" };
  }

  // Nunca editar staff da plataforma / super_admin por esta via.
  const { data: prof, error: profErr } = await sb
    .from("profiles")
    .select("is_super_admin")
    .eq("id", userId)
    .maybeSingle();
  if (profErr) return { ok: false, error: "API_ERROR", message: profErr.message };
  if (prof?.is_super_admin) {
    return { ok: false, error: "FORBIDDEN", message: "não é possível editar este usuário" };
  }

  const { error } = await sb.from("profiles").update({ full_name: name }).eq("id", userId);
  if (error) return { ok: false, error: "API_ERROR", message: error.message };

  return { ok: true };
}
