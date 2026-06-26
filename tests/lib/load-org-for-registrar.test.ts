import { describe, it, expect, vi, beforeEach } from "vitest";

const { adminClientMock } = vi.hoisted(() => ({ adminClientMock: vi.fn() }));
vi.mock("@socios-ai/auth/admin", () => ({ getSupabaseAdminClient: adminClientMock }));

import { loadOrgForRegistrar } from "../../lib/data-registrar";

function buildSb(opts: {
  org?: { id: string; name: string; slug: string; metadata: unknown; created_at: string } | null;
  members?: Array<Record<string, unknown>>;
  profiles?: Array<{ id: string; full_name: string | null; email: string | null }>;
  orgError?: { message: string } | null;
  membersError?: { message: string } | null;
}) {
  const tables: string[] = [];
  let orgSelectColsString = "";
  let memSelectColsString = "";

  // orgs: select(...).eq("id", orgId).maybeSingle()
  const orgMaybeSingle = vi.fn(() =>
    Promise.resolve(
      opts.orgError
        ? { data: null, error: opts.orgError }
        : { data: opts.org ?? null, error: null }
    )
  );
  const orgEq = vi.fn(() => ({ maybeSingle: orgMaybeSingle }));
  const orgSelect = vi.fn((cols: string) => {
    orgSelectColsString = cols;
    return { eq: orgEq };
  });

  // app_memberships: select(...).eq("org_id", orgId).is("revoked_at", null)
  const memIs = vi.fn(() =>
    Promise.resolve(
      opts.membersError
        ? { data: null, error: opts.membersError }
        : { data: opts.members ?? [], error: null }
    )
  );
  const memEq = vi.fn(() => ({ is: memIs }));
  const memSelect = vi.fn((cols: string) => {
    memSelectColsString = cols;
    return { eq: memEq };
  });

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
    orgSelectColsString: () => orgSelectColsString,
    memSelectColsString: () => memSelectColsString,
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

  it("selects only non-financial columns from orgs table", async () => {
    const { sb, orgSelectColsString } = buildSb({ org: ORG, members: [], profiles: [] });
    adminClientMock.mockReturnValue(sb);
    await loadOrgForRegistrar("org-1");

    // Exact match is the real guard: ANY added column (financial or not) breaks it.
    expect(orgSelectColsString()).toBe("id, name, slug, metadata, created_at");
  });

  it("selects only non-financial columns from app_memberships table", async () => {
    const { sb, memSelectColsString } = buildSb({ org: ORG, members: [], profiles: [] });
    adminClientMock.mockReturnValue(sb);
    await loadOrgForRegistrar("org-1");

    // Exact match is the real guard: ANY added column (financial or not) breaks it.
    expect(memSelectColsString()).toBe("app_slug, role_slug, user_id, granted_at");
  });

  it("throws with error context when orgs query fails", async () => {
    const { sb } = buildSb({
      org: ORG,
      members: [],
      profiles: [],
      orgError: { message: "database connection failed" },
    });
    adminClientMock.mockReturnValue(sb);

    await expect(loadOrgForRegistrar("org-1")).rejects.toThrow(/loadOrgForRegistrar \(org\)/);
  });

  it("throws with error context when app_memberships query fails", async () => {
    const { sb } = buildSb({
      org: ORG,
      members: [],
      profiles: [],
      membersError: { message: "database connection failed" },
    });
    adminClientMock.mockReturnValue(sb);

    await expect(loadOrgForRegistrar("org-1")).rejects.toThrow(/loadOrgForRegistrar \(members\)/);
  });
});
