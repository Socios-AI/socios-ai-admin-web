"use server";

import { revalidatePath } from "next/cache";
import { getCallerClient } from "@socios-ai/auth/admin";
import { getCallerJwt, getCallerClaims } from "@/lib/auth";

export type CreateAffiliateInvitationResult =
  | { ok: true; token: string; inviteUrl: string }
  | { ok: false; error: "FORBIDDEN" | "VALIDATION" | "API_ERROR"; message?: string };

const ID_WEB_BASE = process.env.IDENTITY_WEB_BASE_URL ?? "https://id.sociosai.com";

export async function createAffiliateInvitationAction(input: {
  email: string;
  displayName: string;
  source?: string;
  expiresInDays?: number;
}): Promise<CreateAffiliateInvitationResult> {
  const claims = await getCallerClaims();
  if (!claims?.super_admin) return { ok: false, error: "FORBIDDEN" };

  const email = input.email?.trim().toLowerCase();
  const displayName = input.displayName?.trim();
  if (!email || !email.includes("@") || !displayName) {
    return { ok: false, error: "VALIDATION", message: "email e displayName são obrigatórios" };
  }

  const jwt = await getCallerJwt();
  if (!jwt) return { ok: false, error: "FORBIDDEN" };

  const sb = getCallerClient({ callerJwt: jwt });
  const { data, error } = await sb.rpc("create_passive_affiliate", {
    p_email: email,
    p_display_name: displayName,
    p_source: input.source?.trim() || null,
    p_expires_in_days: input.expiresInDays ?? 7,
  });

  if (error) {
    return { ok: false, error: "API_ERROR", message: error.message };
  }

  const token = typeof data === "string" ? data : "";
  if (!token) {
    return { ok: false, error: "API_ERROR", message: "RPC retornou token vazio" };
  }

  revalidatePath("/affiliates");
  return {
    ok: true,
    token,
    inviteUrl: `${ID_WEB_BASE.replace(/\/$/, "")}/affiliate-invite/${encodeURIComponent(token)}`,
  };
}
