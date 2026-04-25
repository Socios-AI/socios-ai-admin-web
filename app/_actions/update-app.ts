"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseAdminClient } from "@socios-ai/auth/admin";
import { getCallerClaims } from "@/lib/auth";
import { updateAppSchema } from "@/lib/validation";

export type UpdateAppResult =
  | { ok: true }
  | { ok: false; error: "FORBIDDEN" | "VALIDATION" | "NOT_FOUND" | "API_ERROR"; message?: string };

export async function updateAppAction(input: unknown): Promise<UpdateAppResult> {
  const claims = await getCallerClaims();
  if (!claims?.super_admin) return { ok: false, error: "FORBIDDEN" };

  const parsed = updateAppSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "VALIDATION", message: parsed.error.issues[0]?.message };
  }

  const sb = getSupabaseAdminClient();
  const data = parsed.data;

  const { data: existing, error: existingError } = await sb
    .from("apps")
    .select("slug, name, status")
    .eq("slug", data.slug)
    .maybeSingle();
  if (existingError) return { ok: false, error: "API_ERROR", message: existingError.message };
  if (!existing) return { ok: false, error: "NOT_FOUND" };

  const { error: updateError } = await sb
    .from("apps")
    .update({
      name: data.name,
      description: data.description ?? null,
      public_url: data.public_url ?? null,
      icon_url: data.icon_url ?? null,
      status: data.status,
      responsible_user_id: data.responsible_user_id ?? null,
    })
    .eq("slug", data.slug);

  if (updateError) {
    return { ok: false, error: "API_ERROR", message: updateError.message };
  }

  await sb.from("audit_log").insert({
    event_type: "app.updated",
    actor_user_id: claims.sub,
    app_slug: data.slug,
    metadata: {
      previous: { name: existing.name, status: existing.status },
      next: { name: data.name, status: data.status },
    },
  });

  revalidatePath("/apps");
  revalidatePath(`/apps/${data.slug}`);
  return { ok: true };
}
