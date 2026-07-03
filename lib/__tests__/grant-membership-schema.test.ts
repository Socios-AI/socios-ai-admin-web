import { describe, it, expect } from "vitest";
import { grantMembershipSchema } from "../validation";

const userId = "11111111-1111-1111-1111-111111111111";
const orgId = "22222222-2222-2222-2222-222222222222";

describe("grantMembershipSchema", () => {
  it("accepts any catalog role slug (e.g. beauty's org_admin)", () => {
    const parsed = grantMembershipSchema.safeParse({
      userId,
      appSlug: "beauty",
      roleSlug: "org_admin",
      orgId,
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects an empty role slug", () => {
    const parsed = grantMembershipSchema.safeParse({
      userId,
      appSlug: "beauty",
      roleSlug: "",
      orgId,
    });
    expect(parsed.success).toBe(false);
  });

  it("rejects a non-uuid orgId", () => {
    const parsed = grantMembershipSchema.safeParse({
      userId,
      appSlug: "beauty",
      roleSlug: "org_admin",
      orgId: "not-a-uuid",
    });
    expect(parsed.success).toBe(false);
  });

  it("allows omitting orgId (app-level grant)", () => {
    const parsed = grantMembershipSchema.safeParse({
      userId,
      appSlug: "case-predictor",
      roleSlug: "case-predictor-admin",
    });
    expect(parsed.success).toBe(true);
  });
});
