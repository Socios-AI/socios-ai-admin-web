import { describe, it, expect } from "vitest";
import { resendPartnerInviteSchema } from "../../lib/validation";

describe("resendPartnerInviteSchema", () => {
  it("aceita um uuid válido", () => {
    const r = resendPartnerInviteSchema.safeParse({
      invitationId: "11111111-1111-1111-1111-111111111111",
    });
    expect(r.success).toBe(true);
  });

  it("rejeita invitationId que não é uuid", () => {
    const r = resendPartnerInviteSchema.safeParse({ invitationId: "nope" });
    expect(r.success).toBe(false);
  });

  it("rejeita objeto sem invitationId", () => {
    const r = resendPartnerInviteSchema.safeParse({});
    expect(r.success).toBe(false);
  });
});
