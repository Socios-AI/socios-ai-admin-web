import { describe, it, expect, vi, beforeEach } from "vitest";

const { authMock, adminClientMock, genMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  adminClientMock: vi.fn(),
  genMock: vi.fn(),
}));

vi.mock("../../lib/auth", () => ({ requireRegistrarOrAdminAAL2: authMock }));
vi.mock("@socios-ai/auth/admin", () => ({ getSupabaseAdminClient: adminClientMock }));
vi.mock("../../lib/contract-generator/generate-and-store", () => ({ generateAndStoreContract: genMock }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { createPartnerInviteAction } from "../../app/_actions/create-partner-invite";

function buildSb() {
  const invInsert = vi.fn().mockResolvedValue({ error: null });
  const invUpdateEq = vi.fn().mockResolvedValue({ error: null });
  const invUpdate = vi.fn(() => ({ eq: invUpdateEq }));
  const contractInsert = vi.fn().mockResolvedValue({ error: null });
  const auditInsert = vi.fn().mockResolvedValue({ error: null });
  return {
    from: vi.fn((table: string) => {
      if (table === "partner_invitations") return { insert: invInsert, update: invUpdate };
      if (table === "partner_contracts") return { insert: contractInsert };
      if (table === "audit_log") return { insert: auditInsert };
      throw new Error(`tabela inesperada no teste: ${table}`);
    }),
    __invInsert: invInsert,
    __contractInsert: contractInsert,
  };
}

const completeProfile = {
  country: "BR" as const,
  person_type: "company" as const,
  tax_id: "11444777000161",
  tax_id_type: "cnpj" as const,
  company_legal_name: "Salão Beleza LTDA",
  legal_rep_name: "Antonio Sanches",
  address_line1: "Av Paulista",
  address_city: "São Paulo",
  address_state: "SP",
  address_postal_code: "01310-100",
};

const baseInput = {
  email: "dono@example.com",
  fullName: "Salão Beleza LTDA",
  targetRole: "licenciado" as const,
  contractProfile: completeProfile,
};

describe("createPartnerInviteAction · trava F3", () => {
  beforeEach(() => {
    authMock.mockReset();
    adminClientMock.mockReset();
    genMock.mockReset();
    authMock.mockResolvedValue({ claims: { sub: "admin-1" } });
  });

  it("dados incompletos: VALIDATION amigável e NENHUM insert (sem convite órfão)", async () => {
    const sb = buildSb();
    adminClientMock.mockReturnValue(sb);
    const r = await createPartnerInviteAction({
      ...baseInput,
      contractProfile: { ...completeProfile, tax_id: undefined, address_city: undefined },
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error).toBe("VALIDATION");
    expect(r.message).toContain("Campos obrigatórios do contrato");
    expect(sb.__invInsert).not.toHaveBeenCalled();
    expect(sb.__contractInsert).not.toHaveBeenCalled();
    expect(genMock).not.toHaveBeenCalled();
  });

  it("território exclusivo com dados completos: cria convite + contrato generation_failed (fluxo de revisão manual preservado)", async () => {
    const sb = buildSb();
    adminClientMock.mockReturnValue(sb);
    genMock.mockResolvedValue({
      ok: false,
      reason: "EXCLUSIVE_TERRITORY",
      message: "Território exclusivo exige revisão jurídica manual.",
    });
    const r = await createPartnerInviteAction({ ...baseInput, territory: "Exclusive: São Paulo" });
    expect(r.ok).toBe(true);
    expect(sb.__invInsert).toHaveBeenCalledTimes(1);
    expect(sb.__contractInsert).toHaveBeenCalledTimes(1);
    const row = sb.__contractInsert.mock.calls[0][0] as { status: string; error_message: string | null };
    expect(row.status).toBe("generation_failed");
    expect(row.error_message).toContain("revisão jurídica");
  });

  it("dados completos: cria convite + contrato pending_review", async () => {
    const sb = buildSb();
    adminClientMock.mockReturnValue(sb);
    genMock.mockResolvedValue({
      ok: true,
      storagePath: "contracts/c1.pdf",
      payloadHash: "hash",
      payload: {},
      country: "BR",
      templateVersion: "v",
    });
    const r = await createPartnerInviteAction(baseInput);
    expect(r.ok).toBe(true);
    const row = sb.__contractInsert.mock.calls[0][0] as { status: string };
    expect(row.status).toBe("pending_review");
  });
});
