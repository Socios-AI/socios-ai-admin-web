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

// Builds a mock supabase client for the single query in listOrgs:
//   from("app_memberships").select(...).not("org_id", "is", null)
//   optionally followed by .eq("app_slug", X)
//
// The Supabase query builder chain returns objects that are both awaitable (thenables)
// and chainable. We model this by attaching .then/.catch/.finally to plain objects,
// making them proper thenables without needing to call them.
function makeThenable(result: { data: unknown; error: unknown }) {
  const p = Promise.resolve(result);
  return {
    then: p.then.bind(p),
    catch: p.catch.bind(p),
    finally: p.finally.bind(p),
  };
}

function buildSb(rows: Array<Record<string, unknown>>, filteredRows?: Array<Record<string, unknown>>) {
  // The terminal node after .not(...) — awaitable + chainable to .eq()
  const eqResolved = vi.fn(() => makeThenable({ data: filteredRows ?? rows, error: null }));

  const notReturn = Object.assign(
    makeThenable({ data: rows, error: null }),
    { eq: eqResolved },
  );

  const selectReturn = { not: vi.fn(() => notReturn) };

  return {
    from: vi.fn(() => ({ select: vi.fn(() => selectReturn) })),
    eqResolved,
    notReturn,
  };
}

const baseRow = (overrides: Partial<Record<string, unknown>>) => ({
  org_id: "org-A",
  app_slug: "case-predictor",
  revoked_at: null,
  granted_at: "2026-04-01T00:00:00.000Z",
  ...overrides,
});

describe("listOrgs", () => {
  it("aggregates app_memberships into (org_id, app_slug) rows with active count", async () => {
    const sb = buildSb([
      baseRow({}),
      baseRow({ granted_at: "2026-04-10T00:00:00.000Z" }),
      baseRow({ revoked_at: "2026-04-15T00:00:00.000Z", granted_at: "2026-04-05T00:00:00.000Z" }),
      baseRow({ org_id: "org-B", app_slug: "admin", granted_at: "2026-04-20T00:00:00.000Z" }),
    ]);
    callerClientMock.mockReturnValue({ from: sb.from });

    const result = await listOrgs({ callerJwt: "jwt" });

    expect(result).toHaveLength(2);
    const orgA = result.find((r) => r.orgId === "org-A");
    const orgB = result.find((r) => r.orgId === "org-B");
    expect(orgA).toMatchObject({ appSlug: "case-predictor", activeMembers: 2 });
    expect(orgB).toMatchObject({ appSlug: "admin", activeMembers: 1 });
  });

  it("filters by app slug when passed", async () => {
    // filteredRows simulates what Supabase returns after applying the .eq("app_slug", X) filter
    const sb = buildSb(
      [
        baseRow({}),
        baseRow({ org_id: "org-B", app_slug: "admin", granted_at: "2026-04-20T00:00:00.000Z" }),
      ],
      // filtered: only case-predictor rows
      [baseRow({})],
    );
    callerClientMock.mockReturnValue({ from: sb.from });

    const result = await listOrgs({ callerJwt: "jwt", app: "case-predictor" });
    expect(result.every((r) => r.appSlug === "case-predictor")).toBe(true);
    // Verify .eq() was called with the right arguments
    expect(sb.eqResolved).toHaveBeenCalledWith("app_slug", "case-predictor");
  });

  it("hides orgs whose memberships are all revoked", async () => {
    const sb = buildSb([
      baseRow({ revoked_at: "2026-04-15T00:00:00.000Z", granted_at: "2026-04-01T00:00:00.000Z" }),
      baseRow({ revoked_at: "2026-04-16T00:00:00.000Z", granted_at: "2026-04-10T00:00:00.000Z" }),
    ]);
    callerClientMock.mockReturnValue({ from: sb.from });

    const result = await listOrgs({ callerJwt: "jwt" });
    expect(result).toHaveLength(0);
  });

  it("tracks firstSeen and lastActivity correctly", async () => {
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
    const errorThenable = Object.assign(
      makeThenable({ data: null, error: { message: "RLS denied" } }),
      { eq: vi.fn() },
    );
    const from = vi.fn(() => ({ select: vi.fn(() => ({ not: vi.fn(() => errorThenable) })) }));
    callerClientMock.mockReturnValue({ from });

    await expect(listOrgs({ callerJwt: "jwt" })).rejects.toThrow(/RLS denied/);
  });

  it("sorts results by lastActivity descending", async () => {
    const sb = buildSb([
      baseRow({ org_id: "org-A", app_slug: "case-predictor", granted_at: "2026-04-01T00:00:00.000Z" }),
      baseRow({ org_id: "org-B", app_slug: "admin", granted_at: "2026-04-20T00:00:00.000Z" }),
    ]);
    callerClientMock.mockReturnValue({ from: sb.from });

    const result = await listOrgs({ callerJwt: "jwt" });
    expect(result[0].orgId).toBe("org-B");
    expect(result[1].orgId).toBe("org-A");
  });
});
