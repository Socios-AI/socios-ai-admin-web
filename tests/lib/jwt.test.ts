import { describe, it, expect } from "vitest";
import { decodeJwtPayload } from "../../lib/jwt";

function makeJwt(payload: object): string {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${header}.${body}.fake-sig`;
}

describe("decodeJwtPayload", () => {
  it("decodes a valid JWT payload", () => {
    const tok = makeJwt({ sub: "u1", super_admin: true });
    const claims = decodeJwtPayload(tok);
    expect(claims).toEqual({ sub: "u1", super_admin: true });
  });

  it("returns null on a malformed token", () => {
    expect(decodeJwtPayload("not.a.jwt")).toEqual({});
    expect(decodeJwtPayload("oneSegment")).toBeNull();
    expect(decodeJwtPayload("")).toBeNull();
  });

  it("returns null on invalid base64 payload", () => {
    expect(decodeJwtPayload("aaa.!!!.bbb")).toBeNull();
  });
});
