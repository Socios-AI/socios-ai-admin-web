import { describe, it, expect } from "vitest";
import { partnerInvitationEmail } from "../../../lib/email-templates/partner-invitation";

describe("partnerInvitationEmail", () => {
  const base = {
    fullName: "Maria Souza",
    inviteUrl: "https://partners.sociosai.com/onboarding/tok123",
    expiresAt: "2026-08-06T00:00:00.000Z",
  };

  it("tem o assunto de convite de licenciado", () => {
    expect(partnerInvitationEmail(base).subject).toBe("Seu convite para ser licenciado Sócios AI");
  });

  it("inclui o link de onboarding no HTML", () => {
    const { html } = partnerInvitationEmail(base);
    expect(html).toContain("https://partners.sociosai.com/onboarding/tok123");
  });

  it("inclui o nome do convidado", () => {
    expect(partnerInvitationEmail(base).html).toContain("Maria Souza");
  });

  it("mostra a validade formatada em pt-BR", () => {
    const expected = new Date(base.expiresAt).toLocaleDateString("pt-BR");
    expect(partnerInvitationEmail(base).html).toContain(expected);
  });

  it("escapa caracteres HTML no nome", () => {
    const { html } = partnerInvitationEmail({ ...base, fullName: "A & <b>" });
    expect(html).toContain("A &amp; &lt;b&gt;");
    expect(html).not.toContain("<b>");
  });

  it("não usa em-dash nem en-dash (regra de estilo)", () => {
    const { subject, html } = partnerInvitationEmail(base);
    expect(subject).not.toMatch(/[—–]/);
    expect(html).not.toMatch(/[—–]/);
  });
});
