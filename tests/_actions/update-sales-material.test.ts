import { describe, it, expect, vi, beforeEach } from "vitest";

const { authMock, adminClientMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  adminClientMock: vi.fn(),
}));

vi.mock("../../lib/auth", () => ({ requireSuperAdminAAL2: authMock }));
vi.mock("@socios-ai/auth/admin", () => ({ getSupabaseAdminClient: adminClientMock }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { updateSalesMaterialAction } from "../../app/_actions/update-sales-material";

type MaterialRow =
  | { id: string; title: string; is_active: boolean }
  | null;

function buildSupabase(existing: MaterialRow, updateError: { message: string } | null = null) {
  const auditInsert = vi.fn().mockResolvedValue({ error: null });
  const updateEq = vi.fn().mockResolvedValue({ error: updateError });
  const updateMock = vi.fn(() => ({ eq: updateEq }));
  const selectEq = vi.fn(() => ({
    maybeSingle: vi.fn().mockResolvedValue({ data: existing, error: null }),
  }));
  const selectMock = vi.fn(() => ({ eq: selectEq }));

  const fromMock = vi.fn((table: string) => {
    if (table === "audit_log") return { insert: auditInsert };
    if (table === "sales_materials") return { select: selectMock, update: updateMock };
    throw new Error(`unexpected table ${table}`);
  });

  return { fromMock, auditInsert, updateMock, updateEq };
}

const SUPER = {
  claims: { super_admin: true, sub: "super-1", aal: "aal2", exp: 9999999999 },
  jwt: "test-jwt",
};
const VALID_ID = "11111111-1111-1111-1111-111111111111";
const validInput = {
  id: VALID_ID,
  title: "Pitch Deck v2",
  description: "Atualizado",
  asset_url: "https://cdn.sociosai.com/pitch-v2.pdf",
  asset_type: "pdf",
  app_slug: null,
  is_active: true,
};

beforeEach(() => {
  authMock.mockReset();
  adminClientMock.mockReset();
});

describe("updateSalesMaterialAction", () => {
  it("happy path: super-admin, valid input → ok, update called", async () => {
    authMock.mockResolvedValue(SUPER);
    const h = buildSupabase({ id: VALID_ID, title: "Old", is_active: true });
    adminClientMock.mockReturnValue({ from: h.fromMock });
    const result = await updateSalesMaterialAction(validInput);
    expect(result).toEqual({ ok: true });
    expect(h.updateMock).toHaveBeenCalled();
  });

  it("non-super-admin → FORBIDDEN, no DB call", async () => {
    authMock.mockResolvedValue(null);
    const result = await updateSalesMaterialAction(validInput);
    expect(result).toEqual({ ok: false, error: "FORBIDDEN" });
    expect(adminClientMock).not.toHaveBeenCalled();
  });

  it("missing row → NOT_FOUND, no update", async () => {
    authMock.mockResolvedValue(SUPER);
    const h = buildSupabase(null);
    adminClientMock.mockReturnValue({ from: h.fromMock });
    const result = await updateSalesMaterialAction(validInput);
    expect(result).toEqual({ ok: false, error: "NOT_FOUND" });
    expect(h.updateMock).not.toHaveBeenCalled();
  });

  it("invalid id → VALIDATION", async () => {
    authMock.mockResolvedValue(SUPER);
    const result = await updateSalesMaterialAction({ ...validInput, id: "not-a-uuid" });
    expect(result).toMatchObject({ ok: false, error: "VALIDATION" });
  });

  it("update db error → API_ERROR", async () => {
    authMock.mockResolvedValue(SUPER);
    const h = buildSupabase({ id: VALID_ID, title: "Old", is_active: true }, { message: "boom" });
    adminClientMock.mockReturnValue({ from: h.fromMock });
    const result = await updateSalesMaterialAction(validInput);
    expect(result).toMatchObject({ ok: false, error: "API_ERROR" });
  });
});
