import { describe, it, expect } from "vitest";
import { deriveAdminRoleSlug } from "../admin-role-slug";

describe("deriveAdminRoleSlug", () => {
  it("prefers tenant-admin", () => {
    expect(deriveAdminRoleSlug({ "tenant-admin": "x", org_admin: "y" }, "beauty")).toBe("tenant-admin");
  });
  it("falls back to <app>-admin then org_admin then any *-admin", () => {
    expect(deriveAdminRoleSlug({ "case-predictor-admin": "x" }, "case-predictor")).toBe("case-predictor-admin");
    expect(deriveAdminRoleSlug({ org_admin: "x" }, "nutrition")).toBe("org_admin");
    expect(deriveAdminRoleSlug({ foo: "x" }, "nutrition")).toBeNull();
  });
});
