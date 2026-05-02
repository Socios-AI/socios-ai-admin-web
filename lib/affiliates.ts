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

export async function getAffiliateProfile(args: {
  callerJwt: string;
  userId: string;
}): Promise<AffiliateProfileRow | null> {
  const sb = getCallerClient({ callerJwt: args.callerJwt });
  const { data, error } = await sb
    .from("affiliate_profiles")
    .select("*")
    .eq("user_id", args.userId)
    .maybeSingle();
  if (error) throw new Error(`getAffiliateProfile failed: ${error.message}`);
  return (data ?? null) as AffiliateProfileRow | null;
}

export type AffiliateAttributionRow = {
  id: string;
  customer_user_id: string;
  source_user_id: string | null;
  source_tier: string;
  source_code: string | null;
  kind: string;
  attribution_method: string | null;
  attributed_at: string;
};

// Lista as attributions onde este afiliado foi a fonte. Cobre tanto
// signup_capture (handle_new_user trigger) quanto checkout_snapshot
// (M.6 server-side em Plan J quando vier).
export async function listAffiliateAttributions(args: {
  callerJwt: string;
  sourceUserId: string;
}): Promise<AffiliateAttributionRow[]> {
  const sb = getCallerClient({ callerJwt: args.callerJwt });
  const { data, error } = await sb
    .from("attributions")
    .select("*")
    .eq("source_user_id", args.sourceUserId)
    .order("attributed_at", { ascending: false });
  if (error) throw new Error(`listAffiliateAttributions failed: ${error.message}`);
  return (data ?? []) as AffiliateAttributionRow[];
}
