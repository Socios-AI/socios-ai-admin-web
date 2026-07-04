import { describe, it, expect } from "vitest";
import { groupOrgsByClient } from "../../lib/data-registrar";

const org = (id: string, niche: string | null, createdAt: string, name = "Antonio Sanches - TESTE") => ({
  id,
  name,
  niche,
  createdAt,
});
const mem = (orgId: string, userId: string | null, roleSlug = "org_admin", appSlug = "platform") => ({
  orgId,
  userId,
  roleSlug,
  appSlug,
});

describe("groupOrgsByClient", () => {
  it("groups multiple orgs of the same owner into one client with all niches", () => {
    const orgs = [
      org("o1", "salao_beleza", "2026-07-03T03:00:00Z"),
      org("o2", "nail_designer", "2026-07-03T02:00:00Z"),
      org("o3", "barbearia", "2026-07-02T00:00:00Z"),
    ];
    const members = [
      mem("o1", "u1", "org_admin", "platform"),
      mem("o1", "u1", "org_admin", "beauty"),
      mem("o2", "u1", "org_admin", "platform"),
      mem("o3", "u1", "org_admin", "platform"),
    ];

    const result = groupOrgsByClient(orgs, members);

    expect(result).toHaveLength(1);
    expect(result[0].key).toBe("u1");
    expect(result[0].orgs).toHaveLength(3);
    // orgs sorted by createdAt desc
    expect(result[0].orgs.map((o) => o.orgId)).toEqual(["o1", "o2", "o3"]);
    // client createdAt = most recent org
    expect(result[0].createdAt).toBe("2026-07-03T03:00:00Z");
    expect(result[0].orgs.map((o) => o.niche)).toEqual(["salao_beleza", "nail_designer", "barbearia"]);
  });

  it("keeps orgs of different owners as separate clients", () => {
    const orgs = [
      org("o1", "salao_beleza", "2026-07-03T00:00:00Z", "Antonio"),
      org("o2", "barbearia", "2026-07-01T00:00:00Z", "Rosan"),
    ];
    const members = [mem("o1", "u1"), mem("o2", "u2")];

    const result = groupOrgsByClient(orgs, members);
    expect(result).toHaveLength(2);
    expect(result.map((c) => c.key)).toEqual(["u1", "u2"]); // sorted by createdAt desc
  });

  it("resolves the owner as the platform org_admin, ignoring non-admin staff on other apps", () => {
    const orgs = [org("o1", "salao_beleza", "2026-07-03T00:00:00Z")];
    const members = [
      mem("o1", "staff-1", "staff", "beauty"),
      mem("o1", "owner-1", "org_admin", "platform"),
    ];
    const result = groupOrgsByClient(orgs, members);
    expect(result).toHaveLength(1);
    expect(result[0].key).toBe("owner-1");
  });

  it("falls back to any member when there is no org_admin", () => {
    const orgs = [org("o1", null, "2026-07-03T00:00:00Z")];
    const members = [mem("o1", "only-member", "staff", "beauty")];
    const result = groupOrgsByClient(orgs, members);
    expect(result[0].key).toBe("only-member");
  });

  it("keeps an org with no members as its own group", () => {
    const orgs = [org("o1", null, "2026-07-03T00:00:00Z", "Orphan Org")];
    const result = groupOrgsByClient(orgs, []);
    expect(result).toHaveLength(1);
    expect(result[0].key).toBe("org:o1");
    expect(result[0].name).toBe("Orphan Org");
    expect(result[0].orgs).toHaveLength(1);
  });

  it("uses the most recent org's name as the client label", () => {
    const orgs = [
      org("o-old", "barbearia", "2026-07-01T00:00:00Z", "Old Name"),
      org("o-new", "salao_beleza", "2026-07-05T00:00:00Z", "New Name"),
    ];
    const members = [mem("o-old", "u1"), mem("o-new", "u1")];
    const result = groupOrgsByClient(orgs, members);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("New Name");
  });

  it("sorts clients by their most recent org, descending", () => {
    const orgs = [
      org("o1", null, "2026-07-01T00:00:00Z", "A"),
      org("o2", null, "2026-07-09T00:00:00Z", "B"),
      org("o3", null, "2026-07-05T00:00:00Z", "C"),
    ];
    const members = [mem("o1", "u1"), mem("o2", "u2"), mem("o3", "u3")];
    const result = groupOrgsByClient(orgs, members);
    expect(result.map((c) => c.name)).toEqual(["B", "C", "A"]);
  });
});
