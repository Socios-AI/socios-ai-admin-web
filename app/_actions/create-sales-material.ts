"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseAdminClient } from "@socios-ai/auth/admin";
import { requireSuperAdminAAL2 } from "@/lib/auth";
import { createSalesMaterialSchema } from "@/lib/validation";

export type CreateSalesMaterialResult =
  | { ok: true }
  | { ok: false; error: "FORBIDDEN" | "VALIDATION" | "API_ERROR"; message?: string };

export async function createSalesMaterialAction(
  input: unknown,
): Promise<CreateSalesMaterialResult> {
  const auth = await requireSuperAdminAAL2();
  if (!auth) return { ok: false, error: "FORBIDDEN" };

  const claims = auth.claims;
  const parsed = createSalesMaterialSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "VALIDATION", message: parsed.error.issues[0]?.message };
  }

  const sb = getSupabaseAdminClient();
  const data = parsed.data;

  const { error: insertError } = await sb.from("sales_materials").insert({
    title: data.title,
    description: data.description ?? null,
    asset_url: data.asset_url,
    asset_type: data.asset_type,
    app_slug: data.app_slug ?? null,
  });

  if (insertError) {
    return { ok: false, error: "API_ERROR", message: insertError.message };
  }

  await sb.from("audit_log").insert({
    event_type: "sales_material.created",
    actor_user_id: claims.sub,
    app_slug: data.app_slug ?? null,
    metadata: {
      title: data.title,
      asset_type: data.asset_type,
    },
  });

  revalidatePath("/materials");
  return { ok: true };
}
