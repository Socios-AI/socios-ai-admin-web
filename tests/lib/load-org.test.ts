import { describe, it, expect, vi, beforeEach } from "vitest";

const { getCallerClientMock } = vi.hoisted(() => ({
  getCallerClientMock: vi.fn(),
}));

vi.mock("@socios-ai/auth/admin", () => ({
  getCallerClient: getCallerClientMock,
}));

import { loadOrg } from "../../lib/data";

// Reuse the thenable pattern from list-orgs.test.ts. Build a sb that routes
// from("app_memberships") → returns members
// from("subscriptions") → returns subs (or [])
function makeThenable<T>(value: T) {
  const p = Promise.resolve(value);
  const obj: any = {};
  obj.then = p.then.bind(p);
  obj.catch = p.catch.bind(p);
  obj.finally = p.finally.bind(p);
  return obj;
}

function buildSb(opts: {
  members?: Array<Record<string, unknown>>;
  membersError?: { message: string } | null;
  subs?: Array<Record<string, unknown>>;
  subsError?: { message: string } | null;
}) {
  // members chain: select(...).eq(org_id).eq(app_slug).is(revoked_at, null) → awaitable
  const memberResult = makeThenable({
    data: opts.members ?? [],
    error: opts.membersError ?? null,
  });
  const memberIs = vi.fn(() => memberResult);
  const memberEq2 = vi.fn(() => ({ is: memberIs }));
  const memberEq1 = vi.fn(() => ({ eq: memberEq2 }));
  const memberSelect = vi.fn(() => ({ eq: memberEq1 }));

  // subs chain: select(...).eq(org_id).order(...) → awaitable
  const subResult = makeThenable({
    data: opts.subs ?? [],
    error: opts.subsError ?? null,
  });
  const subOrder = vi.fn(() => subResult);
  const subEq = vi.fn(() => ({ order: subOrder }));
  const subSelect = vi.fn(() => ({ eq: subEq }));

  return {
    from: vi.fn((table: string) => {
      if (table === "app_memberships") return { select: memberSelect };
      if (table === "subscriptions") return { select: subSelect };
      throw new Error(`unexpected table ${table}`);
    }),
  };
}

describe("loadOrg", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns null when org has no active members in the app", async () => {
    getCallerClientMock.mockReturnValue(buildSb({ members: [] }));

    const result = await loadOrg({
      callerJwt: "jwt",
      orgId: "org-A",
      appSlug: "case-predictor",
    });
    expect(result).toBeNull();
  });

  it("returns members and subscriptions when org exists", async () => {
    getCallerClientMock.mockReturnValue(
      buildSb({
        members: [
          {
            id: "m1",
            user_id: "u1",
            role_slug: "tenant-admin",
            created_at: "2026-04-01T00:00:00.000Z",
            profiles: { id: "u1", email: "alice@acme.com" },
          },
        ],
        subs: [
          {
            id: "s1",
            status: "active",
            started_at: "2026-04-10T00:00:00.000Z",
            current_period_end: "2026-12-31T00:00:00.000Z",
            canceled_at: null,
            external_ref: null,
            metadata: {},
            plans: {
              id: "p1",
              slug: "team",
              name: "Team",
              billing_period: "yearly",
              price_amount: 50000,
              currency: "BRL",
              plan_apps: [{ app_slug: "case-predictor" }],
            },
          },
        ],
      }),
    );

    const result = await loadOrg({
      callerJwt: "jwt",
      orgId: "org-A",
      appSlug: "case-predictor",
    });
    expect(result).not.toBeNull();
    expect(result!.members).toHaveLength(1);
    expect(result!.members[0]).toMatchObject({
      userId: "u1",
      email: "alice@acme.com",
      roleSlug: "tenant-admin",
    });
    expect(result!.subscriptions).toHaveLength(1);
    expect(result!.subscriptions[0]).toMatchObject({ id: "s1", status: "active" });
  });
});
