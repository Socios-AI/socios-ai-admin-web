type PartnerInvitationProps = {
  fullName: string;
  inviteUrl: string;
  expiresAt: string;
};

export function partnerInvitationEmail(
  p: PartnerInvitationProps,
): { subject: string; html: string } {
  const expiresFmt = new Date(p.expiresAt).toLocaleDateString("pt-BR");
  const subject = "Seu convite para ser licenciado Sócios AI";
  const html = `<!doctype html>
<html lang="pt-BR">
<head><meta charset="utf-8"><title>Convite Sócios AI</title></head>
<body style="font-family: -apple-system, system-ui, sans-serif; background:#f5f5f5; padding:24px; color:#0a0a0a;">
  <div style="max-width:560px; margin:0 auto; background:#fff; border-radius:8px; padding:32px;">
    <h1 style="margin:0 0 16px; font-size:22px; font-weight:600;">Seu convite chegou</h1>
    <p style="margin:0 0 12px;">Olá ${escapeHtml(p.fullName)},</p>
    <p style="margin:0 0 16px;">Você foi convidado(a) para se tornar licenciado(a) da <strong>Sócios AI</strong>. Clique abaixo para concluir seu cadastro.</p>
    <p style="margin:0 0 24px;">O convite é válido até ${expiresFmt}.</p>
    <p style="text-align:center; margin:0 0 24px;">
      <a href="${p.inviteUrl}" style="background:#a8e6a3; color:#0a0a0a; padding:12px 24px; border-radius:6px; text-decoration:none; font-weight:600; display:inline-block;">Concluir cadastro</a>
    </p>
    <p style="margin:0 0 12px; font-size:12px; color:#666;">Se o botão não funcionar, copie e cole este link no navegador:</p>
    <p style="margin:0; font-size:12px; word-break:break-all; color:#666;"><a href="${p.inviteUrl}">${p.inviteUrl}</a></p>
  </div>
  <p style="text-align:center; margin:16px 0 0; font-size:11px; color:#999;">Sócios AI · sociosai.com</p>
</body>
</html>`;
  return { subject, html };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
