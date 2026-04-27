import { describe, it, expect } from "vitest";
import { parseAuditUrlParams, serializeAuditUrlParams } from "../../lib/audit-url-params";

describe("parseAuditUrlParams", () => {
  it("returns empty filters when nothing in searchParams", () => {
    const result = parseAuditUrlParams({});
    expect(result).toEqual({
      event_type: undefined,
      app_slug: undefined,
      from: undefined,
      to: undefined,
      actor: undefined,
      actor_id: undefined,
      target: undefined,
      target_id: undefined,
      cursor: null,
    });
  });

  it("parses all filters when present", () => {
    const result = parseAuditUrlParams({
      event_type: "plan.updated",
      app_slug: "case-predictor",
      from: "2026-04-01T00:00:00Z",
      to: "2026-04-30T23:59:59Z",
      actor: "ana",
      target_id: "11111111-1111-1111-1111-111111111111",
    });
    expect(result.event_type).toBe("plan.updated");
    expect(result.app_slug).toBe("case-predictor");
    expect(result.from).toBe("2026-04-01T00:00:00Z");
    expect(result.to).toBe("2026-04-30T23:59:59Z");
    expect(result.actor).toBe("ana");
    expect(result.target_id).toBe("11111111-1111-1111-1111-111111111111");
  });

  it("decodes after as cursor", () => {
    const cursor = Buffer.from(JSON.stringify({ created_at: "2026-04-26T10:30:00Z", id: 42 })).toString("base64url");
    const result = parseAuditUrlParams({ after: cursor });
    expect(result.cursor).toEqual({ created_at: "2026-04-26T10:30:00Z", id: 42 });
  });

  it("ignores invalid cursor (returns null)", () => {
    const result = parseAuditUrlParams({ after: "garbage" });
    expect(result.cursor).toBeNull();
  });

  it("trims whitespace on actor/target search strings", () => {
    const result = parseAuditUrlParams({ actor: "  ana  ", target: " " });
    expect(result.actor).toBe("ana");
    expect(result.target).toBeUndefined();
  });

  it("ignores actor_id that is not a UUID", () => {
    const result = parseAuditUrlParams({ actor_id: "not-a-uuid" });
    expect(result.actor_id).toBeUndefined();
  });

  it("accepts valid UUID for actor_id and target_id", () => {
    const u = "11111111-1111-1111-1111-111111111111";
    const result = parseAuditUrlParams({ actor_id: u, target_id: u });
    expect(result.actor_id).toBe(u);
    expect(result.target_id).toBe(u);
  });
});

describe("serializeAuditUrlParams", () => {
  it("emits empty string when nothing set", () => {
    expect(serializeAuditUrlParams({})).toBe("");
  });

  it("preserves only non-empty keys", () => {
    const qs = serializeAuditUrlParams({ event_type: "plan.updated", actor: "ana" });
    const params = new URLSearchParams(qs);
    expect(params.get("event_type")).toBe("plan.updated");
    expect(params.get("actor")).toBe("ana");
    expect(params.has("app_slug")).toBe(false);
  });

  it("includes after when cursor provided", () => {
    const qs = serializeAuditUrlParams({}, { created_at: "2026-04-26T10:30:00Z", id: 42 });
    expect(qs).toContain("after=");
  });

  it("URL-encodes values with special chars", () => {
    const qs = serializeAuditUrlParams({ actor: "user+tag@example.com" });
    expect(qs).toContain("actor=user%2Btag%40example.com");
  });
});
