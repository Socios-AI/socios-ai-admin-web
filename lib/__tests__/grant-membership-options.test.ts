import { describe, it, expect } from "vitest";
import { roleOptionsFromCatalog } from "../grant-membership-options";

describe("roleOptionsFromCatalog", () => {
  it("maps a role_catalog into sorted {slug,label} options", () => {
    const opts = roleOptionsFromCatalog({ org_user: "Org User", org_admin: "Org Admin" });
    expect(opts).toEqual([
      { slug: "org_admin", label: "Org Admin" },
      { slug: "org_user", label: "Org User" },
    ]);
  });

  it("returns a single option for a one-role app (beauty)", () => {
    const opts = roleOptionsFromCatalog({ org_admin: "Owner / Org Admin" });
    expect(opts).toEqual([{ slug: "org_admin", label: "Owner / Org Admin" }]);
  });

  it("returns [] for an empty or missing catalog", () => {
    expect(roleOptionsFromCatalog({})).toEqual([]);
    expect(roleOptionsFromCatalog(null)).toEqual([]);
    expect(roleOptionsFromCatalog(undefined)).toEqual([]);
  });
});
