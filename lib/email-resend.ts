import { Resend } from "resend";

export type SendArgs = {
  to: string;
  subject: string;
  html: string;
  idempotencyKey: string;
};

export async function sendViaResend(args: SendArgs): Promise<{ id: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("RESEND_API_KEY missing");
  const fromAddress = process.env.EMAIL_FROM_ADDRESS;
  if (!fromAddress) throw new Error("EMAIL_FROM_ADDRESS missing");
  const fromName = process.env.EMAIL_FROM_NAME ?? "Sócios AI";
  const replyTo = process.env.EMAIL_REPLY_TO;
  const from = `${fromName} <${fromAddress}>`;

  const resend = new Resend(apiKey);
  const { data, error } = await resend.emails.send(
    { from, to: args.to, subject: args.subject, html: args.html, replyTo },
    { idempotencyKey: args.idempotencyKey },
  );

  if (error || !data?.id) {
    throw new Error(`resend send failed: ${error?.message ?? "no id returned"}`);
  }
  return { id: data.id };
}
