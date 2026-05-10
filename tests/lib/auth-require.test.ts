import { describe, it, expect, vi, beforeEach } from "vitest";

const { cookiesMock } = vi.hoisted(() => ({
  cookiesMock: vi.fn(),
}));

vi.mock("next/headers", () => ({
  cookies: cookiesMock,
}));

// Build a JWT with the given payload + a benign signature. The helper
// only base64-decodes the middle segment; signature is never inspected.
function buildJwt(payload: Record<string, unknown>): string {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${header}.${body}.signature`;
}

// Mirrors the read path of getCallerJwt: cookies().get(`sb-${ref}-auth-token`).value
// where ref comes from NEXT_PUBLIC_SUPABASE_URL. @supabase/ssr v0.5+ wraps the
// access token in a JSON array as the cookie body. extractAccessToken handles
// both shapes.
function cookieStoreWith(jwt: string | null) {
  return {
    get: (name: string) => {
      if (name !== "sb-test-auth-token") return undefined;
      if (jwt === null) return undefined;
      // Match the @supabase/ssr "base64-" prefixed JSON array shape.
      const body = Buffer.from(JSON.stringify({ access_token: jwt })).toString("base64");
      return { name, value: `base64-${body}` };
    },
    getAll: () => [],
  };
}

const FUTURE_EXP = Math.floor(Date.now() / 1000) + 3600;
const PAST_EXP = Math.floor(Date.now() / 1000) - 3600;

beforeEach(() => {
  cookiesMock.mockReset();
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
});

describe("requireSuperAdminAAL2", () => {
  it("returns null when no session cookie", async () => {
    cookiesMock.mockResolvedValue(cookieStoreWith(null));
    const { requireSuperAdminAAL2 } = await import("../../lib/auth");
    expect(await requireSuperAdminAAL2()).toBeNull();
  });

  it("returns null when JWT cannot be decoded", async () => {
    cookiesMock.mockResolvedValue(cookieStoreWith("not-a-jwt"));
    const { requireSuperAdminAAL2 } = await import("../../lib/auth");
    expect(await requireSuperAdminAAL2()).toBeNull();
  });

  it("returns null when JWT exp is in the past", async () => {
    const jwt = buildJwt({ sub: "u1", super_admin: true, aal: "aal2", exp: PAST_EXP });
    cookiesMock.mockResolvedValue(cookieStoreWith(jwt));
    const { requireSuperAdminAAL2 } = await import("../../lib/auth");
    expect(await requireSuperAdminAAL2()).toBeNull();
  });

  it("returns null when super_admin claim is false", async () => {
    const jwt = buildJwt({ sub: "u1", super_admin: false, aal: "aal2", exp: FUTURE_EXP });
    cookiesMock.mockResolvedValue(cookieStoreWith(jwt));
    const { requireSuperAdminAAL2 } = await import("../../lib/auth");
    expect(await requireSuperAdminAAL2()).toBeNull();
  });

  it("returns null when aal is aal1 (no MFA verification)", async () => {
    const jwt = buildJwt({ sub: "u1", super_admin: true, aal: "aal1", exp: FUTURE_EXP });
    cookiesMock.mockResolvedValue(cookieStoreWith(jwt));
    const { requireSuperAdminAAL2 } = await import("../../lib/auth");
    expect(await requireSuperAdminAAL2()).toBeNull();
  });

  it("returns claims + jwt when super_admin + aal2 + not expired", async () => {
    const jwt = buildJwt({ sub: "u1", super_admin: true, aal: "aal2", exp: FUTURE_EXP });
    cookiesMock.mockResolvedValue(cookieStoreWith(jwt));
    const { requireSuperAdminAAL2 } = await import("../../lib/auth");
    const result = await requireSuperAdminAAL2();
    expect(result).not.toBeNull();
    expect(result!.claims.super_admin).toBe(true);
    expect(result!.jwt).toBe(jwt);
  });
});
