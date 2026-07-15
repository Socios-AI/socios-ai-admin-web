import { describe, it, expect, vi, beforeEach } from "vitest";

const { authMock, adminClientMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  adminClientMock: vi.fn(),
}));

vi.mock("../../lib/auth", () => ({ requireSuperAdminAAL2: authMock }));
vi.mock("@socios-ai/auth/admin", () => ({ getSupabaseAdminClient: adminClientMock }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { setOnboardingMilestoneAction } from "../../app/_actions/set-onboarding-milestone";

function buildSb(exists: boolean, updateError: { message: string } | null = null) {
  const updateEq = vi.fn().mockResolvedValue({ error: updateError });
  const update = vi.fn((_payload: Record<string, unknown>) => ({ eq: updateEq }));
  const maybeSingle = vi.fn().mockResolvedValue(
    exists
      ? { data: { id: "p1", welcome_kit_shipped_at: null }, error: null }
      : { data: null, error: null },
  );
  const select = vi.fn(() => ({ eq: vi.fn(() => ({ maybeSingle })) }));
  const audit = vi.fn().mockResolvedValue({ error: null });
  const from = vi.fn((table: string) => {
    if (table === "audit_log") return { insert: audit };
    return { select, update };
  });
  return { from, update, audit };
}

const SUPER = {
  claims: { super_admin: true, sub: "super-1", aal: "aal2", exp: 9999999999 },
  jwt: "test-jwt",
};
const PARTNER_ID = "22222222-2222-2222-2222-222222222222";

beforeEach(() => {
  authMock.mockReset();
  adminClientMock.mockReset();
});

describe("setOnboardingMilestoneAction", () => {
  it("non-super-admin → FORBIDDEN, no DB call", async () => {
    authMock.mockResolvedValue(null);
    const r = await setOnboardingMilestoneAction({
      partnerId: PARTNER_ID,
      milestone: "welcome_kit",
      done: true,
    });
    expect(r).toEqual({ ok: false, error: "FORBIDDEN" });
    expect(adminClientMock).not.toHaveBeenCalled();
  });

  it("invalid milestone → VALIDATION", async () => {
    authMock.mockResolvedValue(SUPER);
    const r = await setOnboardingMilestoneAction({
      partnerId: PARTNER_ID,
      milestone: "not_a_milestone",
      done: true,
    });
    expect(r).toMatchObject({ ok: false, error: "VALIDATION" });
  });

  it("invalid partnerId → VALIDATION", async () => {
    authMock.mockResolvedValue(SUPER);
    const r = await setOnboardingMilestoneAction({
      partnerId: "nope",
      milestone: "welcome_kit",
      done: true,
    });
    expect(r).toMatchObject({ ok: false, error: "VALIDATION" });
  });

  it("missing partner → NOT_FOUND, no update", async () => {
    authMock.mockResolvedValue(SUPER);
    const sb = buildSb(false);
    adminClientMock.mockReturnValue(sb);
    const r = await setOnboardingMilestoneAction({
      partnerId: PARTNER_ID,
      milestone: "welcome_kit",
      done: true,
    });
    expect(r).toEqual({ ok: false, error: "NOT_FOUND" });
    expect(sb.update).not.toHaveBeenCalled();
  });

  it("done=true → sets the milestone column to a timestamp", async () => {
    authMock.mockResolvedValue(SUPER);
    const sb = buildSb(true);
    adminClientMock.mockReturnValue(sb);
    const r = await setOnboardingMilestoneAction({
      partnerId: PARTNER_ID,
      milestone: "welcome_kit",
      done: true,
    });
    expect(r).toEqual({ ok: true });
    const payload = sb.update.mock.calls[0][0] as Record<string, unknown>;
    expect(payload).toHaveProperty("welcome_kit_shipped_at");
    expect(typeof payload.welcome_kit_shipped_at).toBe("string");
    expect(sb.audit).toHaveBeenCalled();
  });

  it("done=false → clears the milestone column to null", async () => {
    authMock.mockResolvedValue(SUPER);
    const sb = buildSb(true);
    adminClientMock.mockReturnValue(sb);
    const r = await setOnboardingMilestoneAction({
      partnerId: PARTNER_ID,
      milestone: "whatsapp_group",
      done: false,
    });
    expect(r).toEqual({ ok: true });
    const payload = sb.update.mock.calls[0][0] as Record<string, unknown>;
    expect(payload).toEqual({ whatsapp_group_joined_at: null });
  });

  it("update db error → API_ERROR", async () => {
    authMock.mockResolvedValue(SUPER);
    const sb = buildSb(true, { message: "boom" });
    adminClientMock.mockReturnValue(sb);
    const r = await setOnboardingMilestoneAction({
      partnerId: PARTNER_ID,
      milestone: "first_meeting",
      done: true,
    });
    expect(r).toMatchObject({ ok: false, error: "API_ERROR" });
  });
});
