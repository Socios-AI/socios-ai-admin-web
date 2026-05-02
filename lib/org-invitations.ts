// lib/org-invitations.ts · Plano M · M.5 · admin-web data layer for org_invitations

import { getCallerClient } from "@socios-ai/auth/admin";

export type OrgInvitationRow = {
  id: string;
  org_id: string;
  email: string;
  role_slug: "org_admin" | "org_user";
  invited_by: string | null;
  invite_token: string;
  expires_at: string;
  consumed_at: string | null;
  status: "sent" | "consumed" | "expired" | "revoked";
  created_at: string;
};

export type OrgRow = {
  id: string;
  name: string;
  slug: string;
  created_by: string | null;
  created_at: string;
};

export async function listOrgInvitations(args: {
  callerJwt: string;
  orgId: string;
}): Promise<OrgInvitationRow[]> {
  const sb = getCallerClient({ callerJwt: args.callerJwt });
  const { data, error } = await sb
    .from("org_invitations")
    .select("*")
    .eq("org_id", args.orgId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(`listOrgInvitations failed: ${error.message}`);
  return (data ?? []) as OrgInvitationRow[];
}

export async function getOrg(args: {
  callerJwt: string;
  orgId: string;
}): Promise<OrgRow | null> {
  const sb = getCallerClient({ callerJwt: args.callerJwt });
  const { data, error } = await sb
    .from("orgs")
    .select("*")
    .eq("id", args.orgId)
    .maybeSingle();
  if (error) throw new Error(`getOrg failed: ${error.message}`);
  return (data ?? null) as OrgRow | null;
}
