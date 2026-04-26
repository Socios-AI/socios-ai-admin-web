import { describe, it, expect } from "vitest";
import { encodeCursor, decodeCursor } from "../../lib/audit-cursor";

describe("audit-cursor", () => {
  it("encode then decode returns the original value", () => {
    const cursor = { created_at: "2026-04-26T10:30:00.123Z", id: 12345 };
    const encoded = encodeCursor(cursor);
    expect(typeof encoded).toBe("string");
    expect(encoded).not.toContain("="); // base64url, no padding
    expect(decodeCursor(encoded)).toEqual(cursor);
  });

  it("decode of undefined returns null", () => {
    expect(decodeCursor(undefined)).toBeNull();
  });

  it("decode of empty string returns null", () => {
    expect(decodeCursor("")).toBeNull();
  });

  it("decode of invalid base64 returns null", () => {
    expect(decodeCursor("!!!not-base64!!!")).toBeNull();
  });

  it("decode of valid base64 with wrong shape returns null", () => {
    const bad = Buffer.from(JSON.stringify({ foo: "bar" })).toString("base64url");
    expect(decodeCursor(bad)).toBeNull();
  });

  it("decode of valid base64 with non-numeric id returns null", () => {
    const bad = Buffer.from(
      JSON.stringify({ created_at: "2026-04-26T10:30:00Z", id: "12345" }),
    ).toString("base64url");
    expect(decodeCursor(bad)).toBeNull();
  });

  it("preserves UTC timestamp exactly", () => {
    const cursor = { created_at: "2026-01-01T00:00:00.000Z", id: 1 };
    expect(decodeCursor(encodeCursor(cursor))!.created_at).toBe("2026-01-01T00:00:00.000Z");
  });
});
