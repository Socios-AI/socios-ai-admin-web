import { describe, it, expect } from "vitest";
import { readSessionCookie, extractAccessToken } from "../../lib/session-cookie";

function makeCookies(entries: Record<string, string>) {
  return {
    get(name: string) {
      return name in entries ? { value: entries[name] } : undefined;
    },
  };
}

describe("readSessionCookie", () => {
  it("returns single base cookie when no chunks present", () => {
    const c = makeCookies({ "sb-x-auth-token": "single" });
    expect(readSessionCookie(c, "sb-x-auth-token")).toBe("single");
  });

  it("assembles chunks when .0 exists", () => {
    const c = makeCookies({
      "sb-x-auth-token.0": "part-a-",
      "sb-x-auth-token.1": "part-b",
    });
    expect(readSessionCookie(c, "sb-x-auth-token")).toBe("part-a-part-b");
  });

  it("returns null when nothing present", () => {
    expect(readSessionCookie(makeCookies({}), "sb-x-auth-token")).toBeNull();
  });
});

describe("extractAccessToken", () => {
  it("returns bare token unchanged", () => {
    expect(extractAccessToken("eyJ.payload.sig")).toBe("eyJ.payload.sig");
  });

  it("extracts access_token from JSON object format (v0.5+)", () => {
    const session = JSON.stringify({
      access_token: "eyJ.real.jwt",
      refresh_token: "ref",
      expires_at: 123,
      user: { id: "u1" },
    });
    expect(extractAccessToken(session)).toBe("eyJ.real.jwt");
  });

  it("extracts access_token from base64-encoded JSON object", () => {
    const session = { access_token: "eyJ.real.jwt", refresh_token: "ref" };
    const encoded = "base64-" + Buffer.from(JSON.stringify(session)).toString("base64");
    expect(extractAccessToken(encoded)).toBe("eyJ.real.jwt");
  });

  it("extracts access_token from JSON array format (legacy)", () => {
    const arr = JSON.stringify(["eyJ.legacy.jwt", "ref", null, null, 123]);
    expect(extractAccessToken(arr)).toBe("eyJ.legacy.jwt");
  });

  it("extracts access_token from base64-encoded JSON array (legacy)", () => {
    const arr = ["eyJ.legacy.jwt", "ref", null, null, 123];
    const encoded = "base64-" + Buffer.from(JSON.stringify(arr)).toString("base64");
    expect(extractAccessToken(encoded)).toBe("eyJ.legacy.jwt");
  });

  it("falls back to raw cookie when JSON is malformed", () => {
    expect(extractAccessToken("base64-not-valid-base64!!!")).toBe("base64-not-valid-base64!!!");
  });
});
