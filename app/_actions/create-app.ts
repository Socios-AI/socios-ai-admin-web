"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseAdminClient } from "@socios-ai/auth/admin";
import { requireSuperAdminAAL2 } from "@/lib/auth";
import { createAppSchema } from "@/lib/validation";

export type CreateAppResult =
  | { ok: true; slug: string }
  | { ok: false; error: "FORBIDDEN" | "VALIDATION" | "CONFLICT" | "API_ERROR"; message?: string };

export async function createAppAction(input: unknown): Promise<CreateAppResult> {
  const auth = await requireSuperAdminAAL2();

  if (!auth) return { ok: false, error: "FORBIDDEN" };

  const claims = auth.claims;
  const parsed = createAppSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "VALIDATION", message: parsed.error.issues[0]?.message };
  }

  const sb = getSupabaseAdminClient();
  const data = parsed.data;

  const { error: insertError } = await sb.from("apps").insert({
    slug: data.slug,
    name: data.name,
    description: data.description ?? null,
    public_url: data.public_url ?? null,
    icon_url: data.icon_url ?? null,
    status: data.status,
    responsible_user_id: data.responsible_user_id ?? null,
    role_catalog: data.role_catalog,
  });

  if (insertError) {
    if (insertError.code === "23505") {
      return { ok: false, error: "CONFLICT", message: "Slug já existe" };
    }
    return { ok: false, error: "API_ERROR", message: insertError.message };
  }

  await sb.from("audit_log").insert({
    event_type: "app.created",
    actor_user_id: claims.sub,
    app_slug: data.slug,
    metadata: {
      name: data.name,
      status: data.status,
    },
  });

  revalidatePath("/apps");
  return { ok: true, slug: data.slug };
}
