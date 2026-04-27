import { describe, it, expect, vi, beforeEach } from "vitest";

const { callerClientMock } = vi.hoisted(() => ({
  callerClientMock: vi.fn(),
}));

vi.mock("@socios-ai/auth/admin", () => ({
  getCallerClient: callerClientMock,
}));

import { searchUserIdsByEmail } from "../../lib/data";

function buildSb(rows: Array<{ id: string }> | null, error: { message: string } | null = null) {
  const limit = vi.fn().mockResolvedValue({ data: rows, error });
  const ilike = vi.fn(() => ({ limit }));
  const select = vi.fn(() => ({ ilike }));
  const from = vi.fn(() => ({ select }));
  return { from, ilike, select, limit };
}

beforeEach(() => {
  callerClientMock.mockReset();
});

describe("searchUserIdsByEmail", () => {
  it("returns VALIDATION error when query has fewer than 3 chars", async () => {
    const result = await searchUserIdsByEmail({ callerJwt: "jwt", query: "ab" });
    expect(result).toEqual({ error: "VALIDATION" });
    expect(callerClientMock).not.toHaveBeenCalled();
  });

  it("returns VALIDATION error when query is whitespace only", async () => {
    const result = await searchUserIdsByEmail({ callerJwt: "jwt", query: "   " });
    expect(result).toEqual({ error: "VALIDATION" });
  });

  it("returns ids and truncated=false when results < 50", async () => {
    const sb = buildSb([{ id: "u1" }, { id: "u2" }]);
    callerClientMock.mockReturnValue({ from: sb.from });

    const result = await searchUserIdsByEmail({ callerJwt: "jwt", query: "ana" });
    expect(result).toEqual({ ids: ["u1", "u2"], truncated: false });
    expect(sb.ilike).toHaveBeenCalledWith("email", "%ana%");
  });

  it("returns truncated=true when exactly 50 results", async () => {
    const fifty = Array.from({ length: 50 }, (_, i) => ({ id: `u${i}` }));
    const sb = buildSb(fifty);
    callerClientMock.mockReturnValue({ from: sb.from });

    const result = await searchUserIdsByEmail({ callerJwt: "jwt", query: "ana" });
    expect("ids" in result && result.truncated).toBe(true);
    expect("ids" in result && result.ids.length).toBe(50);
  });

  it("returns empty ids when no matches", async () => {
    const sb = buildSb([]);
    callerClientMock.mockReturnValue({ from: sb.from });

    const result = await searchUserIdsByEmail({ callerJwt: "jwt", query: "nobody" });
    expect(result).toEqual({ ids: [], truncated: false });
  });

  it("escapes % and _ in the query so ILIKE pattern is literal-ish", async () => {
    const sb = buildSb([]);
    callerClientMock.mockReturnValue({ from: sb.from });

    await searchUserIdsByEmail({ callerJwt: "jwt", query: "ana%" });
    expect(sb.ilike).toHaveBeenCalledWith("email", "%ana\\%%");
  });

  it("throws when supabase returns error", async () => {
    const sb = buildSb(null, { message: "RLS denied" });
    callerClientMock.mockReturnValue({ from: sb.from });

    await expect(
      searchUserIdsByEmail({ callerJwt: "jwt", query: "ana" }),
    ).rejects.toThrow(/RLS denied/);
  });
});
