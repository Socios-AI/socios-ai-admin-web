import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const { verifyMock } = vi.hoisted(() => ({ verifyMock: vi.fn() }));
vi.mock("jose", () => ({
  jwtVerify: verifyMock,
}));

import { middleware } from "../middleware";

beforeEach(() => {
  verifyMock.mockReset();
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://axyssxqttfnbtawanasf.supabase.co";
  process.env.SUPABASE_JWT_SECRET = "test-jwt-secret-very-long-string-for-hs256";
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

  it("passes through when super_admin claim is true", async () => {
    verifyMock.mockResolvedValue({ payload: { super_admin: true, sub: "u1" } });
    const res = await middleware(makeReq("/users", { cookieValue: "valid" }));
    // NextResponse.next() returns 200 with no rewrite header
    expect(res.status).toBe(200);
    expect(res.headers.get("x-middleware-rewrite")).toBeNull();
  });
});
