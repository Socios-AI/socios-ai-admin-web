import { describe, it, expect } from "vitest";
import { appCanReceiveOrgInvite } from "../../lib/org-invite-base";

describe("appCanReceiveOrgInvite", () => {
  it("true para app tenant com public_url", () => {
    expect(appCanReceiveOrgInvite("beauty", "https://beauty.sociosai.com")).toBe(true);
  });
  it("false para platform mesmo com public_url", () => {
    expect(appCanReceiveOrgInvite("platform", "https://x")).toBe(false);
  });
  it("false quando não há public_url", () => {
    expect(appCanReceiveOrgInvite("beauty", null)).toBe(false);
    expect(appCanReceiveOrgInvite("beauty", undefined)).toBe(false);
    expect(appCanReceiveOrgInvite("beauty", "")).toBe(false);
  });
});
