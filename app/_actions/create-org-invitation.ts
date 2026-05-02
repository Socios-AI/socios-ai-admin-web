"use server";

import { revalidatePath } from "next/cache";
import { getCallerClient } from "@socios-ai/auth/admin";
import { getCallerJwt, getCallerClaims } from "@/lib/auth";

export type CreateOrgInvitationResult =
  | { ok: true; token: string; inviteUrl: string }
  | { ok: false; error: "FORBIDDEN" | "VALIDATION" | "API_ERROR"; message?: string };

const ID_WEB_BASE = process.env.IDENTITY_WEB_BASE_URL ?? "https://id.sociosai.com";

export async function createOrgInvitationAction(input: {
  orgId: string;
  email: string;
  roleSlug: "org_admin" | "org_user";
  expiresInDays?: number;
}): Promise<CreateOrgInvitationResult> {
  const claims = await getCallerClaims();
  if (!claims?.super_admin) return { ok: false, error: "FORBIDDEN" };

  const jwt = await getCallerJwt();
  if (!jwt) return { ok: false, error: "FORBIDDEN" };

  const email = input.email?.trim().toLowerCase();
  if (!email || !email.includes("@")) {
    return { ok: false, error: "VALIDATION", message: "email inválido" };
  }
  if (!["org_admin", "org_user"].includes(input.roleSlug)) {
    return { ok: false, error: "VALIDATION", message: "role_slug inválido" };
  }

  const sb = getCallerClient({ callerJwt: jwt });
  const { data, error } = await sb.rpc("org_admin_invite", {
    p_org_id: input.orgId,
    p_email: email,
    p_role_slug: input.roleSlug,
    p_expires_in_days: input.expiresInDays ?? 7,
  });

  if (error) {
    return { ok: false, error: "API_ERROR", message: error.message };
  }

  const token = typeof data === "string" ? data : "";
  if (!token) {
    return { ok: false, error: "API_ERROR", message: "RPC retornou token vazio" };
  }

  revalidatePath(`/orgs/${input.orgId}/members`);
  return {
    ok: true,
    token,
    inviteUrl: `${ID_WEB_BASE.replace(/\/$/, "")}/org-invite/${encodeURIComponent(token)}`,
  };
}
