"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseAdminClient } from "@socios-ai/auth/admin";
import { requireSuperAdminAAL2 } from "@/lib/auth";
import { updateSalesMaterialSchema } from "@/lib/validation";

export type UpdateSalesMaterialResult =
  | { ok: true }
  | { ok: false; error: "FORBIDDEN" | "VALIDATION" | "NOT_FOUND" | "API_ERROR"; message?: string };

export async function updateSalesMaterialAction(
  input: unknown,
): Promise<UpdateSalesMaterialResult> {
  const auth = await requireSuperAdminAAL2();
  if (!auth) return { ok: false, error: "FORBIDDEN" };

  const claims = auth.claims;
  const parsed = updateSalesMaterialSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "VALIDATION", message: parsed.error.issues[0]?.message };
  }

  const sb = getSupabaseAdminClient();
  const data = parsed.data;

  const { data: existing, error: existingError } = await sb
    .from("sales_materials")
    .select("id, title, is_active")
    .eq("id", data.id)
    .maybeSingle();
  if (existingError) return { ok: false, error: "API_ERROR", message: existingError.message };
  if (!existing) return { ok: false, error: "NOT_FOUND" };

  const { error: updateError } = await sb
    .from("sales_materials")
    .update({
      title: data.title,
      description: data.description ?? null,
      asset_url: data.asset_url,
      asset_type: data.asset_type,
      app_slug: data.app_slug ?? null,
      is_active: data.is_active,
    })
    .eq("id", data.id);

  if (updateError) {
    return { ok: false, error: "API_ERROR", message: updateError.message };
  }

  await sb.from("audit_log").insert({
    event_type: "sales_material.updated",
    actor_user_id: claims.sub,
    app_slug: data.app_slug ?? null,
    metadata: {
      material_id: data.id,
      previous: { title: existing.title, is_active: existing.is_active },
      next: { title: data.title, is_active: data.is_active },
    },
  });

  revalidatePath("/materials");
  return { ok: true };
}
