// lib/affiliates.ts · Plano M · M.3.e · admin-web data layer for afiliados puros

import { getCallerClient } from "@socios-ai/auth/admin";

export type AffiliateInvitationRow = {
  id: string;
  email: string;
  display_name: string;
  source: string | null;
  invite_token: string;
  expires_at: string;
  consumed_at: string | null;
  status: "sent" | "consumed" | "expired" | "revoked";
  created_at: string;
};

export type AffiliateProfileRow = {
  user_id: string;
  affiliate_code: string;
  display_name: string;
  source: string | null;
  is_active: boolean;
  created_at: string;
};

export async function listAffiliateInvitations(args: {
  callerJwt: string;
  status?: AffiliateInvitationRow["status"];
}): Promise<AffiliateInvitationRow[]> {
  const sb = getCallerClient({ callerJwt: args.callerJwt });
  let q = sb.from("affiliate_invitations").select("*");
  if (args.status) q = q.eq("status", args.status);
  const { data, error } = await q.order("created_at", { ascending: false });
  if (error) throw new Error(`listAffiliateInvitations failed: ${error.message}`);
  return (data ?? []) as AffiliateInvitationRow[];
}

export async function listAffiliateProfiles(args: {
  callerJwt: string;
}): Promise<AffiliateProfileRow[]> {
  const sb = getCallerClient({ callerJwt: args.callerJwt });
  const { data, error } = await sb
    .from("affiliate_profiles")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw new Error(`listAffiliateProfiles failed: ${error.message}`);
  return (data ?? []) as AffiliateProfileRow[];
}
