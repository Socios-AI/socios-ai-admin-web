"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseAdminClient } from "@socios-ai/auth/admin";
import { requireSuperAdminAAL2 } from "@/lib/auth";
import { getContractPreviewUrl } from "@/lib/contract-storage";
import { createSignatureRequestForContract } from "@/lib/dropbox-sign-sync";

export type ContractRow = {
  id: string;
  status: string;
  country: string | null;
  createdAt: string;
  email: string;
  fullName: string;
  previewUrl: string | null;
};

export async function listPendingContractsAction(): Promise<
  { ok: true; rows: ContractRow[] } | { ok: false; error: string }
> {
  const auth = await requireSuperAdminAAL2();
  if (!auth) return { ok: false, error: "FORBIDDEN" };

  const sb = getSupabaseAdminClient();
  const { data, error } = await sb
    .from("partner_contracts")
    .select("id, status, country, created_at, storage_path_generated, partner_invitations(email, full_name)")
    .in("status", ["pending_review", "generation_failed"])
    .order("created_at", { ascending: false });
  if (error) return { ok: false, error: error.message };

  const rows: ContractRow[] = [];
  for (const r of data ?? []) {
    const inv = (r as { partner_invitations?: { email?: string; full_name?: string } }).partner_invitations;
    let previewUrl: string | null = null;
    const path = (r as { storage_path_generated?: string | null }).storage_path_generated;
    if (path) {
      try { previewUrl = await getContractPreviewUrl(path); } catch { previewUrl = null; }
    }
    rows.push({
      id: r.id as string,
      status: r.status as string,
      country: (r.country as string | null) ?? null,
      createdAt: r.created_at as string,
      email: inv?.email ?? "",
      fullName: inv?.full_name ?? "",
      previewUrl,
    });
  }
  return { ok: true, rows };
}

export async function approveAndSendContractAction(
  input: { contractId: string },
): Promise<{ ok: true } | { ok: false; error: string; message?: string }> {
  const auth = await requireSuperAdminAAL2();
  if (!auth) return { ok: false, error: "FORBIDDEN" };

  const sb = getSupabaseAdminClient();
  const { data: c, error: readErr } = await sb
    .from("partner_contracts")
    .select("id, status, storage_path_generated, partner_invitation_id")
    .eq("id", input.contractId)
    .maybeSingle();
  if (readErr) return { ok: false, error: "API_ERROR", message: readErr.message };
  if (!c) return { ok: false, error: "NOT_FOUND" };
  if (c.status !== "pending_review") return { ok: false, error: "INVALID_STATE", message: c.status as string };

  const { data: inv, error: invErr } = await sb
    .from("partner_invitations")
    .select("email, full_name")
    .eq("id", c.partner_invitation_id as string)
    .maybeSingle();
  if (invErr) return { ok: false, error: "API_ERROR", message: invErr.message };
  if (!inv?.email) return { ok: false, error: "NOT_FOUND", message: "convite sem e-mail do candidato" };

  // Baixa o PDF gerado do storage para enviar ao provedor.
  const { data: file, error: dlErr } = await sb.storage
    .from("partner-contracts")
    .download(c.storage_path_generated as string);
  if (dlErr || !file) return { ok: false, error: "STORAGE_ERROR", message: dlErr?.message };
  const pdf = Buffer.from(await file.arrayBuffer());

  let sr: Awaited<ReturnType<typeof createSignatureRequestForContract>>;
  try {
    sr = await createSignatureRequestForContract({
      contractId: c.id as string,
      invitationId: c.partner_invitation_id as string,
      candidateName: inv.full_name ?? "",
      candidateEmail: inv.email,
      pdf,
    });
  } catch (e) {
    return { ok: false, error: "DROPBOX_SIGN_ERROR", message: e instanceof Error ? e.message : String(e) };
  }

  const { data: marked, error: updateErr } = await sb
    .from("partner_contracts")
    .update({ status: "sent", envelope_id: sr.envelopeId, reviewed_by: auth.claims.sub, reviewed_at: new Date().toISOString(), sent_at: new Date().toISOString() })
    .eq("id", c.id as string)
    .eq("status", "pending_review")
    .select("id");
  if (updateErr) return { ok: false, error: "API_ERROR", message: updateErr.message };
  if (!marked || marked.length === 0) return { ok: false, error: "INVALID_STATE", message: "status mudou durante o envio" };

  await sb.from("audit_log").insert({
    event_type: "partner_contract.approved_sent",
    actor_user_id: auth.claims.sub,
    metadata: { contract_id: c.id, envelope_id: sr.envelopeId, mocked: sr.mocked },
  });

  revalidatePath("/partners/contracts");
  return { ok: true };
}

export async function rejectContractAction(
  input: { contractId: string; reason: string },
): Promise<{ ok: true } | { ok: false; error: string }> {
  const auth = await requireSuperAdminAAL2();
  if (!auth) return { ok: false, error: "FORBIDDEN" };
  if (!input.reason.trim()) return { ok: false, error: "VALIDATION" };

  const sb = getSupabaseAdminClient();
  const { error } = await sb
    .from("partner_contracts")
    .update({ status: "rejected", reject_reason: input.reason, reviewed_by: auth.claims.sub, reviewed_at: new Date().toISOString() })
    .eq("id", input.contractId)
    .eq("status", "pending_review");
  if (error) return { ok: false, error: error.message };

  await sb.from("audit_log").insert({
    event_type: "partner_contract.rejected",
    actor_user_id: auth.claims.sub,
    metadata: { contract_id: input.contractId, reason: input.reason },
  });

  revalidatePath("/partners/contracts");
  return { ok: true };
}
