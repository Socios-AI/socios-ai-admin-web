import { describe, it, expect, vi, beforeEach } from "vitest";

const { adminClientMock } = vi.hoisted(() => ({ adminClientMock: vi.fn() }));
vi.mock("@socios-ai/auth/admin", () => ({ getSupabaseAdminClient: adminClientMock }));

import { loadOrgForRegistrar } from "../../lib/data-registrar";

function buildSb(opts: {
  org?: { id: string; name: string; slug: string; metadata: unknown; created_at: string } | null;
  members?: Array<Record<string, unknown>>;
  profiles?: Array<{ id: string; full_name: string | null; email: string | null }>;
}) {
  const tables: string[] = [];

  // orgs: select(...).eq("id", orgId).maybeSingle()
  const orgMaybeSingle = vi.fn(() => Promise.resolve({ data: opts.org ?? null, error: null }));
  const orgEq = vi.fn(() => ({ maybeSingle: orgMaybeSingle }));
  const orgSelect = vi.fn(() => ({ eq: orgEq }));

  // app_memberships: select(...).eq("org_id", orgId).is("revoked_at", null)
  const memIs = vi.fn(() => Promise.resolve({ data: opts.members ?? [], error: null }));
  const memEq = vi.fn(() => ({ is: memIs }));
  const memSelect = vi.fn(() => ({ eq: memEq }));

  // profiles (via resolveNames): select(...).in("id", ids)
  const profIn = vi.fn(() => Promise.resolve({ data: opts.profiles ?? [], error: null }));
  const profSelect = vi.fn(() => ({ in: profIn }));

  return {
    sb: {
      from: vi.fn((table: string) => {
        tables.push(table);
        if (table === "orgs") return { select: orgSelect };
        if (table === "app_memberships") return { select: memSelect };
        if (table === "profiles") return { select: profSelect };
        throw new Error(`unexpected table ${table}`);
      }),
    },
    tables,
    memSelect,
  };
}

const ORG = {
  id: "org-1",
  name: "Clínica Giselle",
  slug: "clinica-giselle",
  metadata: { niche: "beauty" },
  created_at: "2026-06-01T00:00:00.000Z",
};

describe("loadOrgForRegistrar", () => {
  beforeEach(() => adminClientMock.mockReset());

  it("returns null when org does not exist", async () => {
    const { sb } = buildSb({ org: null });
    adminClientMock.mockReturnValue(sb);
    expect(await loadOrgForRegistrar("missing")).toBeNull();
  });

  it("returns org + members with email, niche from metadata", async () => {
    const { sb } = buildSb({
      org: ORG,
      members: [
        { app_slug: "beauty", role_slug: "tenant-admin", user_id: "u1", granted_at: "2026-06-02T00:00:00.000Z" },
      ],
      profiles: [{ id: "u1", full_name: "Giselle", email: "giselle@x.com" }],
    });
    adminClientMock.mockReturnValue(sb);

    const r = await loadOrgForRegistrar("org-1");
    expect(r).not.toBeNull();
    expect(r!.name).toBe("Clínica Giselle");
    expect(r!.niche).toBe("beauty");
    expect(r!.members).toEqual([
      { appSlug: "beauty", roleSlug: "tenant-admin", email: "giselle@x.com", grantedAt: "2026-06-02T00:00:00.000Z" },
    ]);
  });

  it("never queries financial tables", async () => {
    const { sb, tables } = buildSb({ org: ORG, members: [], profiles: [] });
    adminClientMock.mockReturnValue(sb);
    await loadOrgForRegistrar("org-1");
    expect(tables).not.toContain("subscriptions");
    expect(tables).not.toContain("plans");
  });
});
