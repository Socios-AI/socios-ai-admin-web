import { describe, it, expect, vi, beforeEach } from "vitest";

const { authMock, adminClientMock, sendMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  adminClientMock: vi.fn(),
  sendMock: vi.fn(),
}));

vi.mock("../../lib/auth", () => ({ requireRegistrarOrAdminAAL2: authMock }));
vi.mock("@socios-ai/auth/admin", () => ({ getSupabaseAdminClient: adminClientMock }));
vi.mock("../../lib/email-resend", () => ({ sendViaResend: sendMock }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { resendPartnerInviteAction } from "../../app/_actions/resend-partner-invite";

type Row = { status: string; email: string; full_name: string; invite_token: string } | null;

function buildSb(row: Row) {
  const updateEq2 = vi.fn().mockResolvedValue({ error: null });
  const update = vi.fn(() => ({ eq: vi.fn(() => ({ eq: updateEq2 })) }));
  const maybeSingle = vi.fn().mockResolvedValue({ data: row, error: null });
  const select = vi.fn(() => ({ eq: vi.fn(() => ({ maybeSingle })) }));
  const audit = vi.fn().mockResolvedValue({ error: null });
  return {
    _updateEq2: updateEq2,
    _audit: audit,
    from: vi.fn((table: string) => {
      if (table === "audit_log") return { insert: audit };
      return { select, update };
    }),
  };
}

const authOk = { claims: { sub: "actor-1", aal: "aal2", exp: 9999999999 }, jwt: "jwt" };
const validInput = { invitationId: "11111111-1111-1111-1111-111111111111" };
const sentRow = { status: "sent", email: "maria@example.com", full_name: "Maria", invite_token: "tok123" };

describe("resendPartnerInviteAction", () => {
  beforeEach(() => {
    authMock.mockReset();
    adminClientMock.mockReset();
    sendMock.mockReset();
    sendMock.mockResolvedValue({ id: "email-1" });
  });

  it("forbidden para quem não é registrar/admin", async () => {
    authMock.mockResolvedValue(null);
    const r = await resendPartnerInviteAction(validInput);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe("FORBIDDEN");
  });

  it("validation quando invitationId não é uuid", async () => {
    authMock.mockResolvedValue(authOk);
    const r = await resendPartnerInviteAction({ invitationId: "x" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe("VALIDATION");
  });

  it("not found quando o convite não existe", async () => {
    authMock.mockResolvedValue(authOk);
    adminClientMock.mockReturnValue(buildSb(null));
    const r = await resendPartnerInviteAction(validInput);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe("NOT_FOUND");
  });

  it("invalid state para convite convertido", async () => {
    authMock.mockResolvedValue(authOk);
    adminClientMock.mockReturnValue(buildSb({ ...sentRow, status: "converted" }));
    const r = await resendPartnerInviteAction(validInput);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe("INVALID_STATE");
  });

  it("invalid state para convite revogado", async () => {
    authMock.mockResolvedValue(authOk);
    adminClientMock.mockReturnValue(buildSb({ ...sentRow, status: "revoked" }));
    const r = await resendPartnerInviteAction(validInput);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe("INVALID_STATE");
  });

  it("reenvia convite pendente: renova validade, envia e-mail, grava audit", async () => {
    authMock.mockResolvedValue(authOk);
    const sb = buildSb(sentRow);
    adminClientMock.mockReturnValue(sb);
    const r = await resendPartnerInviteAction(validInput);
    expect(r.ok).toBe(true);
    expect(sb._updateEq2).toHaveBeenCalledTimes(1); // update expires_at aplicado
    expect(sendMock).toHaveBeenCalledTimes(1);
    const sendArg = sendMock.mock.calls[0][0];
    expect(sendArg.to).toBe("maria@example.com");
    expect(sendArg.html).toContain("/onboarding/tok123");
    expect(sb._audit).toHaveBeenCalledTimes(1);
  });

  it("email failed quando o envio lança (validade já renovada)", async () => {
    authMock.mockResolvedValue(authOk);
    const sb = buildSb(sentRow);
    adminClientMock.mockReturnValue(sb);
    sendMock.mockRejectedValue(new Error("resend down"));
    const r = await resendPartnerInviteAction(validInput);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe("EMAIL_FAILED");
    expect(sb._updateEq2).toHaveBeenCalledTimes(1); // validade renovada antes do envio
  });
});
