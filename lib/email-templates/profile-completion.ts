export function profileCompletionEmail(args: { recipientName: string; completeUrl: string }) {
  const subject = "Complete seu cadastro de parceiro · Sócios AI";
  const html = `<!doctype html><html lang="pt-BR"><meta charset="utf-8"><body style="font-family:sans-serif;max-width:560px;margin:auto">
    <p>Olá ${escapeHtml(args.recipientName)},</p>
    <p>Pra finalizar seu cadastro de parceiro, complete seus dados no link abaixo:</p>
    <p><a href="${args.completeUrl}" style="display:inline-block;background:#111;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none">Completar cadastro</a></p>
    <p style="color:#666;font-size:13px">Ou copie: ${args.completeUrl}</p>
    <p style="color:#666;font-size:13px">Este link expira em 14 dias.</p>
  </body></html>`;
  return { subject, html };
}
function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}
