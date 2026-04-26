import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const { verifyMock, jwksMock } = vi.hoisted(() => ({
  verifyMock: vi.fn(),
  jwksMock: vi.fn(() => ({ kty: "EC" })),
}));
vi.mock("jose", () => ({
  jwtVerify: verifyMock,
  createRemoteJWKSet: jwksMock,
}));

import { middleware } from "../middleware";

beforeEach(() => {
  verifyMock.mockReset();
  jwksMock.mockClear();
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://axyssxqttfnbtawanasf.supabase.co";
});

function makeReq(pathname: string, opts: { cookieValue?: string } = {}): NextRequest {
  const url = new URL(`https://admin.sociosai.com${pathname}`);
  const init: { headers: Record<string, string> } = { headers: {} };
  if (opts.cookieValue) {
    init.headers.cookie = `sb-axyssxqttfnbtawanasf-auth-token=${opts.cookieValue}`;
  }
  return new NextRequest(url, init);
}

describe("middleware", () => {
  it("passes through static asset paths", async () => {
    const res = await middleware(makeReq("/_next/static/x.js"));
    expect(res.status).toBe(200);
  });

  it("redirects to id login when no cookie", async () => {
    const res = await middleware(makeReq("/users"));
    expect(res.status).toBe(307);
    const loc = res.headers.get("location") ?? "";
    expect(loc).toContain("https://id.sociosai.com/login");
    expect(loc).toContain("from=https%3A%2F%2Fadmin.sociosai.com%2Fusers");
  });

  it("rewrites to /forbidden when JWT lacks super_admin claim", async () => {
    verifyMock.mockResolvedValue({ payload: { super_admin: false, sub: "u1" } });
    const res = await middleware(makeReq("/users", { cookieValue: "fake.jwt.token" }));
    // NextResponse.rewrite returns status 200 with x-middleware-rewrite header
    expect(res.headers.get("x-middleware-rewrite") ?? "").toContain("/forbidden");
  });

  it("redirects to id login when JWT verification fails", async () => {
    verifyMock.mockRejectedValue(new Error("bad signature"));
    const res = await middleware(makeReq("/users", { cookieValue: "tampered" }));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("https://id.sociosai.com/login");
  });

  it("passes through when super_admin AND mfa_enrolled AND aal=aal2", async () => {
    verifyMock.mockResolvedValue({
      payload: { super_admin: true, mfa_enrolled: true, aal: "aal2", sub: "u1" },
    });
    const res = await middleware(makeReq("/users", { cookieValue: "valid" }));
    // NextResponse.next() returns 200 with no rewrite header
    expect(res.status).toBe(200);
    expect(res.headers.get("x-middleware-rewrite")).toBeNull();
  });

  it("redirects to id mfa-enroll when super_admin but mfa_enrolled=false", async () => {
    verifyMock.mockResolvedValue({
      payload: { super_admin: true, mfa_enrolled: false, aal: "aal1", sub: "u1" },
    });
    const res = await middleware(makeReq("/users", { cookieValue: "valid" }));
    expect(res.status).toBe(307);
    const loc = res.headers.get("location") ?? "";
    expect(loc).toContain("https://id.sociosai.com/mfa-enroll");
    expect(loc).toContain("from=https%3A%2F%2Fadmin.sociosai.com%2Fusers");
  });

  it("redirects to id mfa-challenge when mfa_enrolled=true but aal=aal1", async () => {
    verifyMock.mockResolvedValue({
      payload: { super_admin: true, mfa_enrolled: true, aal: "aal1", sub: "u1" },
    });
    const res = await middleware(makeReq("/users", { cookieValue: "valid" }));
    expect(res.status).toBe(307);
    const loc = res.headers.get("location") ?? "";
    expect(loc).toContain("https://id.sociosai.com/mfa-challenge");
    expect(loc).toContain("from=https%3A%2F%2Fadmin.sociosai.com%2Fusers");
  });
});
