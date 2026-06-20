import { describe, it, expect } from "vitest";
import { createOrgSchema } from "../validation";

describe("createOrgSchema", () => {
  const base = {
    appSlug: "beauty",
    tenantName: "Clinica X",
    tenantSlug: "clinica-x",
    adminEmail: "dono@clinica.com",
  };

  it("accepts a valid payload without introducer", () => {
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

  it("rejects a bad slug", () => {
    expect(createOrgSchema.safeParse({ ...base, tenantSlug: "X" }).success).toBe(false);
  });
});
