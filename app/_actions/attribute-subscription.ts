"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCallerClient } from "@socios-ai/auth/admin";
import { requireSuperAdminAAL2 } from "@/lib/auth";

const schema = z.object({
  subscriptionId: z.string().uuid(),
  partnerId: z.string().uuid().nullable(),
});

export type AttributeSubscriptionResult =
  | { ok: true }
  | { ok: false; error: "FORBIDDEN" | "VALIDATION" | "API_ERROR"; message?: string };

/** Atribui (ou desatribui, partnerId=null) uma assinatura a um parceiro. Chama o
 *  RPC admin_attribute_subscription com o JWT do admin (não service_role) pra que
 *  auth.uid() resolva is_super_admin()=true. Seta o attributed_to_user_id que a
 *  cascata de comissão lê. */
export async function attributeSubscriptionAction(
  input: unknown,
): Promise<AttributeSubscriptionResult> {
  const auth = await requireSuperAdminAAL2();
  if (!auth) return { ok: false, error: "FORBIDDEN" };

  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "VALIDATION", message: parsed.error.issues[0]?.message };
  }
  const { subscriptionId, partnerId } = parsed.data;

  const sb = getCallerClient({ callerJwt: auth.jwt });
  const { error } = await sb.rpc("admin_attribute_subscription", {
    p_subscription_id: subscriptionId,
    p_partner_id: partnerId,
  });

  if (error) {
    if (error.code === "42501") return { ok: false, error: "FORBIDDEN" };
    return { ok: false, error: "API_ERROR", message: error.message };
  }

  revalidatePath("/attributions");
  return { ok: true };
}
