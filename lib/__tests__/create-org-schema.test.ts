import { describe, it, expect } from "vitest";
import { createOrgSchema } from "../validation";

describe("createOrgSchema", () => {
  const base = {
    appSlug: "beauty",
    tenantName: "Clinica X",
    adminEmail: "dono@clinica.com",
  };

  it("accepts a valid payload without introducer (no slug needed)", () => {
    expect(createOrgSchema.safeParse(base).success).toBe(true);
  });

  it("accepts an optional introducedByPartnerId as uuid", () => {
    const r = createOrgSchema.safeParse({
      ...base,
      introducedByPartnerId: "b0000000-0000-0000-0000-000000000002",
    });
    expect(r.success).toBe(true);
  });

  it("rejects a non-uuid introducer", () => {
    const r = createOrgSchema.safeParse({ ...base, introducedByPartnerId: "nope" });
    expect(r.success).toBe(false);
  });

  it("rejects a too-short tenant name", () => {
    expect(createOrgSchema.safeParse({ ...base, tenantName: "X" }).success).toBe(false);
  });

  it("drops tenantSlug if passed (no longer part of the schema)", () => {
    const r = createOrgSchema.safeParse({ ...base, tenantSlug: "WHATEVER!!" });
    expect(r.success).toBe(true);
    if (r.success) expect("tenantSlug" in r.data).toBe(false);
  });
});
