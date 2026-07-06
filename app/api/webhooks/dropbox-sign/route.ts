import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@socios-ai/auth/admin";
import { verifyDropboxWebhookEvent, downloadSignedPdf } from "@/lib/dropbox-sign-sync";
import { storeSignedPdf } from "@/lib/contract-storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Dropbox Sign envia o callback como form field "json" e exige que a resposta
// contenha o texto "Hello API Event Received".
const ACK = "Hello API Event Received";

type DbxEvent = {
  event?: { event_type?: string; event_hash?: string; event_time?: string };
  signature_request?: { signature_request_id?: string; metadata?: { contract_id?: string } };
};

async function readEvent(req: Request): Promise<DbxEvent | null> {
  const ct = req.headers.get("content-type") ?? "";
  try {
    if (ct.includes("application/json")) return JSON.parse(await req.text()) as DbxEvent;
    const form = new URLSearchParams(await req.text());
    const json = form.get("json");
    return json ? (JSON.parse(json) as DbxEvent) : null;
  } catch {
    return null;
  }
}

export async function POST(req: Request): Promise<NextResponse> {
  const event = await readEvent(req);
  if (!event) return NextResponse.json({ error: "invalid_body" }, { status: 400 });

  if (!verifyDropboxWebhookEvent(event)) {
    return NextResponse.json({ error: "invalid_signature" }, { status: 401 });
  }

  const type = event.event?.event_type;

  // Evento de teste do provedor (verificação de endpoint): só ACK.
  if (type === "callback_test") {
    return new NextResponse(ACK, { status: 200 });
  }

  const contractId = event.signature_request?.metadata?.contract_id;
  const srId = event.signature_request?.signature_request_id;

  const sb = getSupabaseAdminClient();

  if (type === "signature_request_all_signed" && contractId && srId) {
    const { data: c } = await sb
      .from("partner_contracts")
      .select("id, status, partner_id, partner_invitation_id")
      .eq("id", contractId)
      .maybeSingle();

    if (c && c.status !== "signed") {
      const pdf = await downloadSignedPdf(srId);
      const signedPath = await storeSignedPdf(contractId, pdf);

      await sb
        .from("partner_contracts")
        .update({ status: "signed", storage_path_signed: signedPath, signed_at: new Date().toISOString() })
        .eq("id", contractId)
        .neq("status", "signed");

      if (c.partner_id) {
        await sb.from("partners").update({ contract_signed_at: new Date().toISOString(), contract_envelope_id: srId }).eq("id", c.partner_id as string);
      }

      await sb.from("audit_log").insert({
        event_type: "partner_contract.signed",
        actor_user_id: null,
        metadata: { contract_id: contractId, envelope_id: srId, source: "dropbox_sign_webhook" },
      });
    }
  } else if (type === "signature_request_viewed" && contractId) {
    await sb.from("partner_contracts").update({ status: "viewed" }).eq("id", contractId).eq("status", "sent");
  } else if (type === "signature_request_declined" && contractId) {
    await sb.from("partner_contracts").update({ status: "declined" }).eq("id", contractId).neq("status", "signed");
  }

  return new NextResponse(ACK, { status: 200 });
}
