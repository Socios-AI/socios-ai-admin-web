import { describe, it, expect, vi, beforeEach } from "vitest";

const { authMock, adminClientMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  adminClientMock: vi.fn(),
}));

vi.mock("../../lib/auth", () => ({ requireSuperAdminAAL2: authMock }));
vi.mock("@socios-ai/auth/admin", () => ({ getSupabaseAdminClient: adminClientMock }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { createSalesMaterialAction } from "../../app/_actions/create-sales-material";

const SUPER = {
  claims: { super_admin: true, sub: "super-1", aal: "aal2", exp: 9999999999 },
  jwt: "test-jwt",
};

function configureSupabase(insertResult: { error: { code?: string; message: string } | null }) {
  const fromMock = vi.fn((table: string) => {
    if (table === "audit_log") return { insert: vi.fn().mockResolvedValue({ error: null }) };
    if (table === "sales_materials") return { insert: vi.fn().mockResolvedValue(insertResult) };
    throw new Error(`unexpected table ${table}`);
  });
  adminClientMock.mockImplementation(() => ({ from: fromMock }) as ReturnType<typeof adminClientMock>);
  return fromMock;
}

const valid = {
  title: "Pitch Deck Oficial",
  description: "Apresentação institucional",
  asset_url: "https://cdn.sociosai.com/pitch.pdf",
  asset_type: "pdf",
  app_slug: null,
};

beforeEach(() => {
  authMock.mockReset();
  adminClientMock.mockReset();
});

describe("createSalesMaterialAction", () => {
  it("happy path: super-admin, valid input → ok", async () => {
    authMock.mockResolvedValue(SUPER);
    configureSupabase({ error: null });
    const result = await createSalesMaterialAction(valid);
    expect(result).toEqual({ ok: true });
  });

  it("non-super-admin → FORBIDDEN, no DB call", async () => {
    authMock.mockResolvedValue(null);
    const result = await createSalesMaterialAction(valid);
    expect(result).toEqual({ ok: false, error: "FORBIDDEN" });
    expect(adminClientMock).not.toHaveBeenCalled();
  });

  it("title too short → VALIDATION", async () => {
    authMock.mockResolvedValue(SUPER);
    const result = await createSalesMaterialAction({ ...valid, title: "X" });
    expect(result).toMatchObject({ ok: false, error: "VALIDATION" });
  });

  it("non-https asset_url → VALIDATION", async () => {
    authMock.mockResolvedValue(SUPER);
    const result = await createSalesMaterialAction({
      ...valid,
      asset_url: "http://insecure.example.com/x.pdf",
    });
    expect(result).toMatchObject({ ok: false, error: "VALIDATION" });
  });

  it("invalid asset_type → VALIDATION", async () => {
    authMock.mockResolvedValue(SUPER);
    const result = await createSalesMaterialAction({ ...valid, asset_type: "gif" });
    expect(result).toMatchObject({ ok: false, error: "VALIDATION" });
  });

  it("db insert error → API_ERROR", async () => {
    authMock.mockResolvedValue(SUPER);
    configureSupabase({ error: { message: "boom" } });
    const result = await createSalesMaterialAction(valid);
    expect(result).toMatchObject({ ok: false, error: "API_ERROR" });
  });
});
