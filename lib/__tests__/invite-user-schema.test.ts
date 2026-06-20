import { describe, it, expect } from "vitest";
import { inviteUserSchema } from "../validation";

describe("inviteUserSchema introducedByPartnerId", () => {
  const base = { email: "a@b.com", fullName: "Fulano", appSlug: "beauty", roleSlug: "tenant-admin" };
  it("accepts payload without indicante", () => {
    expect(inviteUserSchema.safeParse(base).success).toBe(true);
  });
  it("accepts a valid uuid indicante", () => {
    expect(inviteUserSchema.safeParse({ ...base, introducedByPartnerId: "b0000000-0000-0000-0000-000000000002" }).success).toBe(true);
  });
  it("rejects a non-uuid indicante", () => {
    expect(inviteUserSchema.safeParse({ ...base, introducedByPartnerId: "nope" }).success).toBe(false);
  });
});
