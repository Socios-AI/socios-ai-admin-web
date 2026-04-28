import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@socios-ai/auth/admin";
import { verifyDropboxWebhookSignature } from "@/lib/dropbox-sign-sync";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type DropboxSignEvent = {
  event?: { event_type?: string };
  signature_request?: {
    signature_request_id?: string;
    metadata?: { invitation_id?: string };
  };
};

export async function POST(req: Request): Promise<NextResponse> {
  const signature = req.headers.get("x-dropbox-sign-signature");
  const raw = await req.text();
  if (!signature || !verifyDropboxWebhookSignature(raw, signature)) {
    return NextResponse.json({ error: "invalid_signature" }, { status: 401 });
  }

  let payload: DropboxSignEvent;
  try {
    payload = JSON.parse(raw) as DropboxSignEvent;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const eventType = payload.event?.event_type;
  if (eventType !== "signature_request_signed") {
    return NextResponse.json({ ok: true, ignored: eventType ?? null });
  }

  const invitationId = payload.signature_request?.metadata?.invitation_id;
  if (!invitationId) {
    return NextResponse.json({ error: "missing_invitation_id" }, { status: 400 });
  }

  const sb = getSupabaseAdminClient();

  const { data: row, error: readError } = await sb
    .from("partner_invitations")
    .select("id, status")
    .eq("id", invitationId)
    .maybeSingle();
  if (readError) {
    return NextResponse.json({ error: "db_error", message: readError.message }, { status: 500 });
  }
  if (!row) {
    return NextResponse.json({ error: "invitation_not_found" }, { status: 404 });
  }

  // Idempotent: only progress from 'sent' to 'contract_signed'.
  if (row.status !== "sent") {
    return NextResponse.json({ ok: true, idempotent: true, status: row.status });
  }

  const { error: updateError } = await sb
    .from("partner_invitations")
    .update({ status: "contract_signed" })
    .eq("id", invitationId)
    .eq("status", "sent");
  if (updateError) {
    return NextResponse.json({ error: "db_error", message: updateError.message }, { status: 500 });
  }

  await sb.from("audit_log").insert({
    event_type: "partner_invitation.contract_signed",
    actor_user_id: null,
    metadata: {
      invitation_id: invitationId,
      envelope_id: payload.signature_request?.signature_request_id ?? null,
      source: "dropbox_sign_webhook",
    },
  });

  return NextResponse.json({ ok: true });
}
