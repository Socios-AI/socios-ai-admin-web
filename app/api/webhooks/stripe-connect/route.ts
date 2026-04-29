import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@socios-ai/auth/admin";
import {
  createConnectAccountLink,
  verifyStripeWebhookSignature,
} from "@/lib/stripe-connect-sync";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type StripeEvent = {
  type?: string;
  data?: { object?: Record<string, unknown> };
};

type AdminClient = ReturnType<typeof getSupabaseAdminClient>;

async function handleCheckoutSessionCompleted(
  sb: AdminClient,
  session: Record<string, unknown>,
): Promise<NextResponse> {
  const metadata = (session.metadata ?? {}) as Record<string, string>;
  const invitationId = metadata.invitation_id;
  if (!invitationId) {
    return NextResponse.json({ error: "missing_invitation_id" }, { status: 400 });
  }

  const { data: inv, error: readError } = await sb
    .from("partner_invitations")
    .select(
      "id, status, email, full_name, license_amount_usd, introduced_by_partner_id, custom_commission_pct",
    )
    .eq("id", invitationId)
    .maybeSingle();
  if (readError) {
    return NextResponse.json({ error: "db_error", message: readError.message }, { status: 500 });
  }
  if (!inv) {
    return NextResponse.json({ error: "invitation_not_found" }, { status: 404 });
  }

  // Idempotent: only progress from 'contract_signed' to 'paid'.
  if (inv.status !== "contract_signed") {
    return NextResponse.json({ ok: true, idempotent: true, status: inv.status });
  }

  const { error: updateError } = await sb
    .from("partner_invitations")
    .update({ status: "paid" })
    .eq("id", invitationId)
    .eq("status", "contract_signed");
  if (updateError) {
    return NextResponse.json({ error: "db_error", message: updateError.message }, { status: 500 });
  }

  // Look up auth.users by email. The `filter` option is forwarded to GoTrue
  // but is not part of the typed PageParams surface — suppress the type error.
  const email = inv.email as string;
  // @ts-expect-error: `filter` is accepted by GoTrue but not in PageParams typing.
  const { data: usersResp } = await sb.auth.admin.listUsers({ filter: `email.eq.${email}` });
  const matched = (usersResp?.users ?? []).find(
    (u: { email?: string }) => u.email?.toLowerCase() === email.toLowerCase(),
  );

  if (!matched) {
    await sb.from("audit_log").insert({
      event_type: "partner.creation_deferred_no_auth_user",
      actor_user_id: null,
      metadata: {
        invitation_id: invitationId,
        email,
        payment_intent: session.payment_intent ?? null,
      },
    });
    return NextResponse.json({ ok: true, partner_created: false });
  }

  const { data: insertedPartner, error: insertError } = await sb
    .from("partners")
    .insert({
      user_id: matched.id,
      status: "pending_kyc",
      introduced_by_partner_id: inv.introduced_by_partner_id,
      custom_commission_pct: inv.custom_commission_pct,
      license_paid_at: new Date().toISOString(),
      license_payment_intent_id: session.payment_intent ?? null,
      license_amount_paid_usd: inv.license_amount_usd,
      contract_envelope_id: null,
      metadata: { source_invitation_id: invitationId },
    })
    .select("id")
    .single();
  if (insertError) {
    return NextResponse.json({ error: "db_error", message: insertError.message }, { status: 500 });
  }

  // Provision a Stripe Connect Express account and persist its id so the
  // `account.updated` webhook can locate this partner later (pending_kyc -> active).
  const insertedPartnerId = insertedPartner?.id as string | undefined;
  if (insertedPartnerId) {
    const adminBase = (process.env.ADMIN_WEB_BASE_URL ?? "https://admin.sociosai.com").replace(
      /\/$/,
      "",
    );
    const connectLink = await createConnectAccountLink({
      partnerId: insertedPartnerId,
      returnUrl: `${adminBase}/partners/${insertedPartnerId}`,
      refreshUrl: `${adminBase}/partners/${insertedPartnerId}`,
    });
    if (connectLink.accountId) {
      const { error: linkError } = await sb
        .from("partners")
        .update({ stripe_connect_account_id: connectLink.accountId })
        .eq("id", insertedPartnerId);
      if (linkError) {
        return NextResponse.json(
          { error: "db_error", message: linkError.message },
          { status: 500 },
        );
      }
    }
  }

  await sb.from("audit_log").insert({
    event_type: "partner.created_from_invitation",
    actor_user_id: null,
    metadata: {
      invitation_id: invitationId,
      user_id: matched.id,
      payment_intent: session.payment_intent ?? null,
    },
  });

  return NextResponse.json({ ok: true, partner_created: true });
}

async function handleAccountUpdated(
  sb: AdminClient,
  account: Record<string, unknown>,
): Promise<NextResponse> {
  if (!account.details_submitted || !account.charges_enabled) {
    return NextResponse.json({ ok: true, ignored: "kyc_incomplete" });
  }
  const accountId = account.id as string | undefined;
  if (!accountId) {
    return NextResponse.json({ error: "missing_account_id" }, { status: 400 });
  }

  const { data: partner, error: readError } = await sb
    .from("partners")
    .select("id, status")
    .eq("stripe_connect_account_id", accountId)
    .maybeSingle();
  if (readError) {
    return NextResponse.json({ error: "db_error", message: readError.message }, { status: 500 });
  }
  if (!partner) {
    return NextResponse.json({ error: "partner_not_found" }, { status: 404 });
  }
  if (partner.status !== "pending_kyc") {
    return NextResponse.json({ ok: true, idempotent: true, status: partner.status });
  }

  const now = new Date().toISOString();
  const { error: updateError } = await sb
    .from("partners")
    .update({ status: "active", kyc_completed_at: now, activated_at: now })
    .eq("id", partner.id)
    .eq("status", "pending_kyc");
  if (updateError) {
    return NextResponse.json({ error: "db_error", message: updateError.message }, { status: 500 });
  }

  await sb.from("audit_log").insert({
    event_type: "partner.activated",
    actor_user_id: null,
    metadata: { partner_id: partner.id, stripe_connect_account_id: accountId },
  });

  return NextResponse.json({ ok: true });
}

export async function POST(req: Request): Promise<NextResponse> {
  const signature = req.headers.get("stripe-signature");
  const raw = await req.text();
  if (!signature || !verifyStripeWebhookSignature(raw, signature)) {
    return NextResponse.json({ error: "invalid_signature" }, { status: 401 });
  }

  let event: StripeEvent;
  try {
    event = JSON.parse(raw) as StripeEvent;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const sb = getSupabaseAdminClient();
  const obj = event.data?.object ?? {};

  if (event.type === "checkout.session.completed") {
    return handleCheckoutSessionCompleted(sb, obj);
  }
  if (event.type === "account.updated") {
    return handleAccountUpdated(sb, obj);
  }
  return NextResponse.json({ ok: true, ignored: event.type ?? null });
}
