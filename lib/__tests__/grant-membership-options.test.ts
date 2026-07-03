import { describe, it, expect } from "vitest";
import {
  roleOptionsFromCatalog,
  nicheOptionsFromCatalog,
  filterOrgsByNiche,
} from "../grant-membership-options";

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

describe("nicheOptionsFromCatalog", () => {
  it("maps a niche_catalog into sorted {key,label} options", () => {
    const opts = nicheOptionsFromCatalog({
      salao_beleza: "Salão de Beleza",
      barbearia: "Barbearia",
    });
    expect(opts).toEqual([
      { key: "barbearia", label: "Barbearia" },
      { key: "salao_beleza", label: "Salão de Beleza" },
    ]);
  });

  it("returns [] when the app has no niche_catalog", () => {
    expect(nicheOptionsFromCatalog(null)).toEqual([]);
    expect(nicheOptionsFromCatalog(undefined)).toEqual([]);
    expect(nicheOptionsFromCatalog({})).toEqual([]);
  });
});

describe("filterOrgsByNiche", () => {
  const orgs = [
    { id: "a", name: "Salão A", niche: "salao_beleza" },
    { id: "b", name: "Barber B", niche: "barbearia" },
    { id: "c", name: "Salão C", niche: "salao_beleza" },
  ];

  it("keeps only orgs of the given niche", () => {
    expect(filterOrgsByNiche(orgs, "salao_beleza").map((o) => o.id)).toEqual(["a", "c"]);
  });

  it("returns [] for a niche with no orgs or empty niche", () => {
    expect(filterOrgsByNiche(orgs, "nail_designer")).toEqual([]);
    expect(filterOrgsByNiche(orgs, "")).toEqual([]);
  });
});
