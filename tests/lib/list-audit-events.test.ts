import { describe, it, expect, vi, beforeEach } from "vitest";

const { callerClientMock } = vi.hoisted(() => ({
  callerClientMock: vi.fn(),
}));

vi.mock("@socios-ai/auth/admin", () => ({
  getCallerClient: callerClientMock,
}));

import { listAuditEvents } from "../../lib/data";

type Row = {
  id: number;
  event_type: string;
  actor_user_id: string | null;
  target_user_id: string | null;
  app_slug: string | null;
  org_id: string | null;
  metadata: Record<string, unknown>;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
};

function makeRow(id: number, overrides: Partial<Row> = {}): Row {
  return {
    id,
    event_type: "plan.updated",
    actor_user_id: "actor-1",
    target_user_id: null,
    app_slug: "case-predictor",
    org_id: null,
    metadata: {},
    ip_address: null,
    user_agent: null,
    created_at: `2026-04-26T10:${String(60 - id).padStart(2, "0")}:00.000Z`,
    ...overrides,
  };
}

function buildSb(rows: Row[] | null, error: { message: string } | null = null) {
  const calls: { method: string; args: unknown[] }[] = [];
  const make = () => {
    const proxy: Record<string, (...args: unknown[]) => unknown> = {};
    const finalize = vi.fn().mockResolvedValue({ data: rows, error });
    const chain = ["select", "eq", "in", "gte", "lte", "or", "order", "limit"];
    for (const m of chain) {
      proxy[m] = vi.fn((...args: unknown[]) => {
        calls.push({ method: m, args });
        return proxy as unknown;
      });
    }
    proxy.limit = vi.fn((...args: unknown[]) => {
      calls.push({ method: "limit", args });
      return finalize();
    });
    return { proxy, calls, finalize };
  };
  const builder = make();
  const from = vi.fn(() => builder.proxy);
  return { from, calls: builder.calls };
}

beforeEach(() => {
  callerClientMock.mockReset();
});

describe("listAuditEvents (without cursor)", () => {
  it("with no filters: select + order + limit 51", async () => {
    const sb = buildSb([]);
    callerClientMock.mockReturnValue({ from: sb.from });

    const result = await listAuditEvents({
      callerJwt: "jwt",
      filters: {},
    });

    expect(result.rows).toEqual([]);
    expect(result.hasMore).toBe(false);
    expect(result.nextCursor).toBeNull();

    const limitCall = sb.calls.find((c) => c.method === "limit");
    expect(limitCall?.args).toEqual([51]);

    const orderCalls = sb.calls.filter((c) => c.method === "order");
    expect(orderCalls).toHaveLength(2);
    expect(orderCalls[0].args).toEqual(["created_at", { ascending: false }]);
    expect(orderCalls[1].args).toEqual(["id", { ascending: false }]);
  });

  it("event_type filter calls eq", async () => {
    const sb = buildSb([]);
    callerClientMock.mockReturnValue({ from: sb.from });

    await listAuditEvents({
      callerJwt: "jwt",
      filters: { event_type: "plan.updated" },
    });

    const eqCalls = sb.calls.filter((c) => c.method === "eq");
    expect(eqCalls.some((c) => c.args[0] === "event_type" && c.args[1] === "plan.updated")).toBe(true);
  });

  it("app_slug filter calls eq", async () => {
    const sb = buildSb([]);
    callerClientMock.mockReturnValue({ from: sb.from });

    await listAuditEvents({
      callerJwt: "jwt",
      filters: { app_slug: "case-predictor" },
    });

    const eqCalls = sb.calls.filter((c) => c.method === "eq");
    expect(eqCalls.some((c) => c.args[0] === "app_slug" && c.args[1] === "case-predictor")).toBe(true);
  });

  it("date range adds gte and lte on created_at", async () => {
    const sb = buildSb([]);
    callerClientMock.mockReturnValue({ from: sb.from });

    await listAuditEvents({
      callerJwt: "jwt",
      filters: { from: "2026-04-01T00:00:00Z", to: "2026-04-30T23:59:59Z" },
    });

    const gte = sb.calls.find((c) => c.method === "gte");
    const lte = sb.calls.find((c) => c.method === "lte");
    expect(gte?.args).toEqual(["created_at", "2026-04-01T00:00:00Z"]);
    expect(lte?.args).toEqual(["created_at", "2026-04-30T23:59:59Z"]);
  });

  it("actorIds=[] returns empty result without querying", async () => {
    const sb = buildSb([]);
    callerClientMock.mockReturnValue({ from: sb.from });

    const result = await listAuditEvents({
      callerJwt: "jwt",
      filters: {},
      actorIds: [],
    });

    expect(result).toEqual({ rows: [], hasMore: false, nextCursor: null });
    expect(sb.from).not.toHaveBeenCalled();
  });

  it("targetIds=[] returns empty result without querying", async () => {
    const sb = buildSb([]);
    callerClientMock.mockReturnValue({ from: sb.from });

    const result = await listAuditEvents({
      callerJwt: "jwt",
      filters: {},
      targetIds: [],
    });

    expect(result).toEqual({ rows: [], hasMore: false, nextCursor: null });
  });

  it("actorIds with values calls in", async () => {
    const sb = buildSb([]);
    callerClientMock.mockReturnValue({ from: sb.from });

    await listAuditEvents({
      callerJwt: "jwt",
      filters: {},
      actorIds: ["a1", "a2"],
    });

    const inCalls = sb.calls.filter((c) => c.method === "in");
    expect(inCalls.some((c) => c.args[0] === "actor_user_id" && Array.isArray(c.args[1]) && (c.args[1] as string[]).join(",") === "a1,a2")).toBe(true);
  });

  it("returns 50 rows + hasMore=true when 51 rows come back", async () => {
    const rows = Array.from({ length: 51 }, (_, i) => makeRow(100 - i));
    const sb = buildSb(rows);
    callerClientMock.mockReturnValue({ from: sb.from });

    const result = await listAuditEvents({ callerJwt: "jwt", filters: {} });

    expect(result.rows.length).toBe(50);
    expect(result.hasMore).toBe(true);
    expect(result.nextCursor).not.toBeNull();
  });

  it("returns all rows + hasMore=false when ≤50 rows", async () => {
    const rows = Array.from({ length: 50 }, (_, i) => makeRow(100 - i));
    const sb = buildSb(rows);
    callerClientMock.mockReturnValue({ from: sb.from });

    const result = await listAuditEvents({ callerJwt: "jwt", filters: {} });

    expect(result.rows.length).toBe(50);
    expect(result.hasMore).toBe(false);
    expect(result.nextCursor).toBeNull();
  });

  it("nextCursor encodes last row's created_at and id", async () => {
    const rows = Array.from({ length: 51 }, (_, i) => makeRow(100 - i));
    const sb = buildSb(rows);
    callerClientMock.mockReturnValue({ from: sb.from });

    const result = await listAuditEvents({ callerJwt: "jwt", filters: {} });

    const lastIncluded = rows[49];
    const decoded = JSON.parse(Buffer.from(result.nextCursor!, "base64url").toString("utf8"));
    expect(decoded.created_at).toBe(lastIncluded.created_at);
    expect(decoded.id).toBe(lastIncluded.id);
  });

  it("throws when supabase returns error", async () => {
    const sb = buildSb(null, { message: "RLS denied" });
    callerClientMock.mockReturnValue({ from: sb.from });

    await expect(
      listAuditEvents({ callerJwt: "jwt", filters: {} }),
    ).rejects.toThrow(/RLS denied/);
  });
});

describe("listAuditEvents (with cursor)", () => {
  it("calls or() with keyset expression when cursor provided", async () => {
    const sb = buildSb([]);
    callerClientMock.mockReturnValue({ from: sb.from });

    await listAuditEvents({
      callerJwt: "jwt",
      filters: {},
      cursor: { created_at: "2026-04-26T10:30:00.000Z", id: 42 },
    });

    const orCall = sb.calls.find((c) => c.method === "or");
    expect(orCall).toBeDefined();
    expect(orCall!.args[0]).toBe(
      "created_at.lt.2026-04-26T10:30:00.000Z,and(created_at.eq.2026-04-26T10:30:00.000Z,id.lt.42)",
    );
  });

  it("cursor=null skips or()", async () => {
    const sb = buildSb([]);
    callerClientMock.mockReturnValue({ from: sb.from });

    await listAuditEvents({ callerJwt: "jwt", filters: {}, cursor: null });
    expect(sb.calls.find((c) => c.method === "or")).toBeUndefined();
  });

  it("cursor + filters: both eq and or are called", async () => {
    const sb = buildSb([]);
    callerClientMock.mockReturnValue({ from: sb.from });

    await listAuditEvents({
      callerJwt: "jwt",
      filters: { event_type: "plan.updated" },
      cursor: { created_at: "2026-04-26T10:30:00.000Z", id: 42 },
    });

    expect(sb.calls.some((c) => c.method === "eq")).toBe(true);
    expect(sb.calls.some((c) => c.method === "or")).toBe(true);
  });
});
