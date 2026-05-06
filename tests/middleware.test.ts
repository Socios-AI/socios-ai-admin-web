import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const { decodeMock, readSessionCookieMock, extractAccessTokenMock } = vi.hoisted(() => ({
  decodeMock: vi.fn(),
  readSessionCookieMock: vi.fn(),
  extractAccessTokenMock: vi.fn(),
}));

vi.mock("../lib/jwt", () => ({
  decodeJwtPayload: decodeMock,
}));

vi.mock("../lib/session-cookie", () => ({
  readSessionCookie: readSessionCookieMock,
  extractAccessToken: extractAccessTokenMock,
}));

import { middleware } from "../middleware";

const FUTURE_EXP = Math.floor(Date.now() / 1000) + 3600;

beforeEach(() => {
  decodeMock.mockReset();
  readSessionCookieMock.mockReset();
  extractAccessTokenMock.mockReset();
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://axyssxqttfnbtawanasf.supabase.co";
});

function makeReq(pathname: string): NextRequest {
  const url = new URL(`https://admin.sociosai.com${pathname}`);
  return new NextRequest(url, { headers: {} });
}

describe("middleware", () => {
  it("passes through static asset paths", async () => {
    const res = await middleware(makeReq("/_next/static/x.js"));
    expect(res.status).toBe(200);
  });

  it("redirects to id login when no session cookie present", async () => {
    readSessionCookieMock.mockReturnValue(null);
    const res = await middleware(makeReq("/users"));
    expect(res.status).toBe(307);
    const loc = res.headers.get("location") ?? "";
    expect(loc).toContain("https://id.sociosai.com/login");
    expect(loc).toContain("from=https%3A%2F%2Fadmin.sociosai.com%2Fusers");
  });

  it("redirects to id login when JWT cannot be decoded", async () => {
    readSessionCookieMock.mockReturnValue("cookie.value");
    extractAccessTokenMock.mockReturnValue("token");
    decodeMock.mockReturnValue(null);
    const res = await middleware(makeReq("/users"));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("https://id.sociosai.com/login");
  });

  it("redirects to id login when JWT is expired", async () => {
    readSessionCookieMock.mockReturnValue("cookie.value");
    extractAccessTokenMock.mockReturnValue("token");
    decodeMock.mockReturnValue({
      super_admin: true,
      mfa_enrolled: true,
      aal: "aal2",
      exp: Math.floor(Date.now() / 1000) - 1,
    });
    const res = await middleware(makeReq("/users"));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("https://id.sociosai.com/login");
  });

  it("rewrites to /forbidden when JWT lacks super_admin claim", async () => {
    readSessionCookieMock.mockReturnValue("cookie.value");
    extractAccessTokenMock.mockReturnValue("token");
    decodeMock.mockReturnValue({ super_admin: false, exp: FUTURE_EXP });
    const res = await middleware(makeReq("/users"));
    expect(res.headers.get("x-middleware-rewrite") ?? "").toContain("/forbidden");
  });

  it("passes through when super_admin AND mfa_enrolled AND aal=aal2", async () => {
    readSessionCookieMock.mockReturnValue("cookie.value");
    extractAccessTokenMock.mockReturnValue("token");
    decodeMock.mockReturnValue({
      super_admin: true,
      mfa_enrolled: true,
      aal: "aal2",
      exp: FUTURE_EXP,
    });
    const res = await middleware(makeReq("/users"));
    expect(res.status).toBe(200);
    expect(res.headers.get("x-middleware-rewrite")).toBeNull();
  });

  it("redirects to id mfa-enroll when super_admin but mfa_enrolled=false", async () => {
    readSessionCookieMock.mockReturnValue("cookie.value");
    extractAccessTokenMock.mockReturnValue("token");
    decodeMock.mockReturnValue({
      super_admin: true,
      mfa_enrolled: false,
      aal: "aal1",
      exp: FUTURE_EXP,
    });
    const res = await middleware(makeReq("/users"));
    expect(res.status).toBe(307);
    const loc = res.headers.get("location") ?? "";
    expect(loc).toContain("https://id.sociosai.com/mfa-enroll");
    expect(loc).toContain("from=https%3A%2F%2Fadmin.sociosai.com%2Fusers");
  });

  it("redirects to id mfa-challenge when mfa_enrolled=true but aal=aal1", async () => {
    readSessionCookieMock.mockReturnValue("cookie.value");
    extractAccessTokenMock.mockReturnValue("token");
    decodeMock.mockReturnValue({
      super_admin: true,
      mfa_enrolled: true,
      aal: "aal1",
      exp: FUTURE_EXP,
    });
    const res = await middleware(makeReq("/users"));
    expect(res.status).toBe(307);
    const loc = res.headers.get("location") ?? "";
    expect(loc).toContain("https://id.sociosai.com/mfa-challenge");
    expect(loc).toContain("from=https%3A%2F%2Fadmin.sociosai.com%2Fusers");
  });

  it("redirects /login to / when fully authenticated (avoid Next.js 404)", async () => {
    readSessionCookieMock.mockReturnValue("cookie.value");
    extractAccessTokenMock.mockReturnValue("token");
    decodeMock.mockReturnValue({
      super_admin: true,
      mfa_enrolled: true,
      aal: "aal2",
      exp: FUTURE_EXP,
    });
    const res = await middleware(makeReq("/login"));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("https://admin.sociosai.com/");
  });

  it("/login without cookie still redirects to id login (default-deny preserved)", async () => {
    readSessionCookieMock.mockReturnValue(null);
    const res = await middleware(makeReq("/login"));
    expect(res.status).toBe(307);
    expect(res.headers.get("location") ?? "").toContain("https://id.sociosai.com/login");
  });
});
