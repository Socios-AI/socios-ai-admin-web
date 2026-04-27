import { describe, it, expect, vi, beforeEach } from "vitest";

const { callerClientMock } = vi.hoisted(() => ({
  callerClientMock: vi.fn(),
}));

vi.mock("@socios-ai/auth/admin", () => ({
  getCallerClient: callerClientMock,
}));

import { resolveProfilesByIds } from "../../lib/data";

function buildSb(rows: Array<{ id: string; email: string }> | null, error: { message: string } | null = null) {
  const inFn = vi.fn().mockResolvedValue({ data: rows, error });
  const select = vi.fn(() => ({ in: inFn }));
  const from = vi.fn(() => ({ select }));
  return { from, select, inFn };
}

beforeEach(() => {
  callerClientMock.mockReset();
});

describe("resolveProfilesByIds", () => {
  it("returns empty Map when ids is empty (no query made)", async () => {
    const result = await resolveProfilesByIds({ callerJwt: "jwt", ids: [] });
    expect(result.size).toBe(0);
    expect(callerClientMock).not.toHaveBeenCalled();
  });

  it("returns Map of id → email for found profiles", async () => {
    const sb = buildSb([
      { id: "u1", email: "ana@x.com" },
      { id: "u2", email: "joao@x.com" },
    ]);
    callerClientMock.mockReturnValue({ from: sb.from });

    const result = await resolveProfilesByIds({ callerJwt: "jwt", ids: ["u1", "u2"] });
    expect(result.size).toBe(2);
    expect(result.get("u1")).toEqual({ email: "ana@x.com" });
    expect(result.get("u2")).toEqual({ email: "joao@x.com" });
  });

  it("ids not in DB are absent from the Map", async () => {
    const sb = buildSb([{ id: "u1", email: "ana@x.com" }]);
    callerClientMock.mockReturnValue({ from: sb.from });

    const result = await resolveProfilesByIds({ callerJwt: "jwt", ids: ["u1", "u-missing"] });
    expect(result.has("u1")).toBe(true);
    expect(result.has("u-missing")).toBe(false);
  });

  it("dedupes ids before query", async () => {
    const sb = buildSb([{ id: "u1", email: "ana@x.com" }]);
    callerClientMock.mockReturnValue({ from: sb.from });

    await resolveProfilesByIds({ callerJwt: "jwt", ids: ["u1", "u1", "u1"] });
    expect(sb.inFn).toHaveBeenCalledWith("id", ["u1"]);
  });

  it("throws when supabase returns error", async () => {
    const sb = buildSb(null, { message: "RLS denied" });
    callerClientMock.mockReturnValue({ from: sb.from });

    await expect(
      resolveProfilesByIds({ callerJwt: "jwt", ids: ["u1"] }),
    ).rejects.toThrow(/RLS denied/);
  });
});
