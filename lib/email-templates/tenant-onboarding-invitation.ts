type TenantInvitationProps = {
  inviterName: string;
  appName: string;
  tenantName: string;
  inviteUrl: string;
  expiresAt: string;
  recipientEmail: string;
};

export function tenantOnboardingInvitationEmail(
  p: TenantInvitationProps,
): { subject: string; html: string } {
  const expiresFmt = new Date(p.expiresAt).toLocaleDateString("pt-BR");
  const subject = `${p.inviterName} cadastrou ${p.tenantName} no ${p.appName}`;
  const html = `<!doctype html>
<html lang="pt-BR">
<head><meta charset="utf-8"><title>Convite ${escapeHtml(p.appName)}</title></head>
<body style="font-family: -apple-system, system-ui, sans-serif; background:#f5f5f5; padding:24px; color:#0a0a0a;">
  <div style="max-width:560px; margin:0 auto; background:#fff; border-radius:8px; padding:32px;">
    <h1 style="margin:0 0 16px; font-size:22px; font-weight:600;">Seu acesso está pronto</h1>
    <p style="margin:0 0 12px;">Olá,</p>
    <p style="margin:0 0 16px;">${escapeHtml(p.inviterName)} cadastrou <strong>${escapeHtml(p.tenantName)}</strong> no <strong>${escapeHtml(p.appName)}</strong> e indicou você como administrador(a).</p>
    <p style="margin:0 0 24px;">Clique abaixo pra criar sua conta de acesso. O convite é válido até ${expiresFmt}.</p>
    <p style="text-align:center; margin:0 0 24px;">
      <a href="${p.inviteUrl}" style="background:#a8e6a3; color:#0a0a0a; padding:12px 24px; border-radius:6px; text-decoration:none; font-weight:600; display:inline-block;">Ativar acesso</a>
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
