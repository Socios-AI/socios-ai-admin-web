import { describe, it, expect, vi, beforeEach } from "vitest";

const { authMock, adminClientMock } = vi.hoisted(() => {
  const insertMock = vi.fn();
  return {
    authMock: vi.fn(),
    insertMock,
    adminClientMock: vi.fn(() => ({
      from: vi.fn(() => ({ insert: insertMock })),
    })),
  };
});

vi.mock("../../lib/auth", () => ({
  requireSuperAdminAAL2: authMock,
}));

vi.mock("@socios-ai/auth/admin", () => ({
  getSupabaseAdminClient: adminClientMock,
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import { createAppAction } from "../../app/_actions/create-app";

beforeEach(() => {
  authMock.mockReset();
  adminClientMock.mockClear();
});

describe("createAppAction", () => {
  function configureSupabase(insertResult: { error: { code?: string; message: string } | null }) {
    const fromMock = vi.fn((table: string) => {
      if (table === "audit_log") {
        return { insert: vi.fn().mockResolvedValue({ error: null }) };
      }
      return { insert: vi.fn().mockResolvedValue(insertResult) };
    });
    adminClientMock.mockImplementation(() => ({ from: fromMock }) as ReturnType<typeof adminClientMock>);
    return fromMock;
  }

  it("happy path: super-admin caller, valid input → ok with slug", async () => {
    authMock.mockResolvedValue({ claims: { super_admin: true, sub: "super-1", aal: "aal2", exp: 9999999999 }, jwt: "test-jwt" });
    configureSupabase({ error: null });

    const result = await createAppAction({
      slug: "case-pred",
      name: "Case Predictor",
      description: "Predicts cases",
      public_url: "https://case-predictor.sociosai.com",
      icon_url: null,
      status: "active",
      role_catalog: { "tenant-admin": "Admin", member: "Member" },
    });

    expect(result).toEqual({ ok: true, slug: "case-pred" });
  });

  it("non-super-admin → FORBIDDEN, no DB call", async () => {
    authMock.mockResolvedValue(null);

    const result = await createAppAction({
      slug: "case-pred",
      name: "Case Predictor",
    });

    expect(result).toEqual({ ok: false, error: "FORBIDDEN" });
    expect(adminClientMock).not.toHaveBeenCalled();
  });

  it("invalid slug → VALIDATION error", async () => {
    authMock.mockResolvedValue({ claims: { super_admin: true, sub: "super-1", aal: "aal2", exp: 9999999999 }, jwt: "test-jwt" });

    const result = await createAppAction({
      slug: "Bad Slug With Spaces",
      name: "X",
    });

    expect(result).toMatchObject({ ok: false, error: "VALIDATION" });
  });

  it("duplicate slug (23505) → CONFLICT", async () => {
    authMock.mockResolvedValue({ claims: { super_admin: true, sub: "super-1", aal: "aal2", exp: 9999999999 }, jwt: "test-jwt" });
    configureSupabase({ error: { code: "23505", message: "duplicate key" } });

    const result = await createAppAction({
      slug: "existing",
      name: "Existing App",
      role_catalog: { admin: "A" },
    });

    expect(result).toMatchObject({ ok: false, error: "CONFLICT" });
  });

  it("non-https public_url → VALIDATION", async () => {
    authMock.mockResolvedValue({ claims: { super_admin: true, sub: "super-1", aal: "aal2", exp: 9999999999 }, jwt: "test-jwt" });

    const result = await createAppAction({
      slug: "ok-slug",
      name: "X",
      public_url: "http://insecure.example.com",
    });

    expect(result).toMatchObject({ ok: false, error: "VALIDATION" });
  });
});
