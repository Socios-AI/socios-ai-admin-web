import { describe, it, expect, vi, beforeEach } from "vitest";

const { callerClientMock } = vi.hoisted(() => ({
  callerClientMock: vi.fn(),
}));

vi.mock("@socios-ai/auth/admin", () => ({
  getCallerClient: callerClientMock,
}));

import { listOrgs } from "../../lib/data";

beforeEach(() => {
  callerClientMock.mockReset();
});

// Mocks the single query in listOrgs:
//   from("app_memberships").select(...).not("org_id","is",null).is("revoked_at",null)
// plus the enrichment query:
//   from("orgs").select(...).in("id", ids)
//
// Supabase's builder returns objects that are both awaitable (thenables) and chainable.
function makeThenable(result: { data: unknown; error: unknown }) {
  const p = Promise.resolve(result);
  return {
    then: p.then.bind(p),
    catch: p.catch.bind(p),
    finally: p.finally.bind(p),
  };
}

function buildSb(
  rows: Array<Record<string, unknown>>,
  orgRows: Array<Record<string, unknown>> = [],
) {
  // app_memberships chain: select(...).not(...).is(...) → awaitable
  const isReturn = makeThenable({ data: rows, error: null });
  const membershipSelect = { not: vi.fn(() => ({ is: vi.fn(() => isReturn) })) };
  // orgs chain: select(...).in(...) → awaitable
  const orgsSelect = { in: vi.fn(() => makeThenable({ data: orgRows, error: null })) };

  const from = vi.fn((table: string) => ({
    select: vi.fn(() => (table === "orgs" ? orgsSelect : membershipSelect)),
  }));

  return { from };
}

// The DB now filters revoked_at at query level, so mock rows are always active.
const baseRow = (overrides: Partial<Record<string, unknown>>) => ({
  org_id: "org-A",
  app_slug: "case-predictor",
  user_id: "user-1",
  granted_at: "2026-04-01T00:00:00.000Z",
  ...overrides,
});

describe("listOrgs", () => {
  it("aggregates memberships into one row per org with distinct members + app breakdown", async () => {
    const sb = buildSb([
      baseRow({ user_id: "user-1" }),
      baseRow({ user_id: "user-2", granted_at: "2026-04-10T00:00:00.000Z" }),
      baseRow({ org_id: "org-B", app_slug: "admin", user_id: "user-3", granted_at: "2026-04-20T00:00:00.000Z" }),
    ]);
    callerClientMock.mockReturnValue({ from: sb.from });

    const result = await listOrgs({ callerJwt: "jwt" });

    expect(result).toHaveLength(2);
    const orgA = result.find((r) => r.orgId === "org-A")!;
    const orgB = result.find((r) => r.orgId === "org-B")!;
    expect(orgA.activeMembers).toBe(2);
    expect(orgA.apps).toHaveLength(1);
    expect(orgA.apps[0]).toMatchObject({ appSlug: "case-predictor", activeMembers: 2 });
    expect(orgB.activeMembers).toBe(1);
    expect(orgB.apps[0].appSlug).toBe("admin");
  });

  it("counts a user present in two apps of the same org as one distinct member, with two app chips", async () => {
    const sb = buildSb([
      baseRow({ app_slug: "case-predictor", user_id: "user-1", granted_at: "2026-04-01T00:00:00.000Z" }),
      baseRow({ app_slug: "beauty", user_id: "user-1", granted_at: "2026-04-20T00:00:00.000Z" }),
    ]);
    callerClientMock.mockReturnValue({ from: sb.from });

    const result = await listOrgs({ callerJwt: "jwt" });
    expect(result).toHaveLength(1);
    expect(result[0].activeMembers).toBe(1);
    expect(result[0].apps).toHaveLength(2);
    // apps ordenados por lastActivity desc → o mais recente (beauty) primeiro.
    expect(result[0].apps[0].appSlug).toBe("beauty");
  });

  it("filters by app slug, keeping the org's other apps in the breakdown", async () => {
    const sb = buildSb([
      baseRow({ org_id: "org-A", app_slug: "case-predictor", user_id: "user-1" }),
      baseRow({ org_id: "org-A", app_slug: "beauty", user_id: "user-1", granted_at: "2026-04-05T00:00:00.000Z" }),
      baseRow({ org_id: "org-B", app_slug: "admin", user_id: "user-2", granted_at: "2026-04-20T00:00:00.000Z" }),
    ]);
    callerClientMock.mockReturnValue({ from: sb.from });

    const result = await listOrgs({ callerJwt: "jwt", app: "beauty" });
    expect(result).toHaveLength(1);
    expect(result[0].orgId).toBe("org-A");
    // O filtro mantém a org, sem esconder os demais apps dela.
    expect(result[0].apps.map((a) => a.appSlug).sort()).toEqual(["beauty", "case-predictor"]);
  });

  it("tracks firstSeen and lastActivity across the whole org", async () => {
    const sb = buildSb([
      baseRow({ granted_at: "2026-04-10T00:00:00.000Z" }),
      baseRow({ granted_at: "2026-04-01T00:00:00.000Z" }),
      baseRow({ granted_at: "2026-04-20T00:00:00.000Z" }),
    ]);
    callerClientMock.mockReturnValue({ from: sb.from });

    const result = await listOrgs({ callerJwt: "jwt" });
    expect(result).toHaveLength(1);
    expect(result[0].firstSeen).toBe("2026-04-01T00:00:00.000Z");
    expect(result[0].lastActivity).toBe("2026-04-20T00:00:00.000Z");
  });

  it("throws when supabase returns error", async () => {
    const errorThenable = makeThenable({ data: null, error: { message: "RLS denied" } });
    const from = vi.fn(() => ({
      select: vi.fn(() => ({ not: vi.fn(() => ({ is: vi.fn(() => errorThenable) })) })),
    }));
    callerClientMock.mockReturnValue({ from });

    await expect(listOrgs({ callerJwt: "jwt" })).rejects.toThrow(/RLS denied/);
  });

  it("enriches rows with org name and slug from the orgs table", async () => {
    const sb = buildSb(
      [baseRow({ org_id: "org-A", app_slug: "case-predictor" })],
      [{ id: "org-A", name: "Clínica Giselle", slug: "clinica-giselle" }],
    );
    callerClientMock.mockReturnValue({ from: sb.from });

    const result = await listOrgs({ callerJwt: "jwt" });
    expect(result[0]).toMatchObject({
      orgId: "org-A",
      name: "Clínica Giselle",
      slug: "clinica-giselle",
    });
  });

  it("falls back to null name/slug when the org row is missing", async () => {
    const sb = buildSb([baseRow({ org_id: "org-A" })], []);
    callerClientMock.mockReturnValue({ from: sb.from });

    const result = await listOrgs({ callerJwt: "jwt" });
    expect(result[0].name).toBeNull();
    expect(result[0].slug).toBeNull();
  });

  it("sorts orgs by lastActivity descending", async () => {
    const sb = buildSb([
      baseRow({ org_id: "org-A", app_slug: "case-predictor", user_id: "user-1", granted_at: "2026-04-01T00:00:00.000Z" }),
      baseRow({ org_id: "org-B", app_slug: "admin", user_id: "user-2", granted_at: "2026-04-20T00:00:00.000Z" }),
    ]);
    callerClientMock.mockReturnValue({ from: sb.from });

    const result = await listOrgs({ callerJwt: "jwt" });
    expect(result[0].orgId).toBe("org-B");
    expect(result[1].orgId).toBe("org-A");
  });
});
