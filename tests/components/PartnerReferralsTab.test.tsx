import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("@/lib/data", () => ({
  listReferralsForPartner: vi.fn(),
}));
vi.mock("@/components/RevokeReferralDialog", () => ({
  RevokeReferralDialog: () => <button>Revogar</button>,
}));
vi.mock("@/components/TransferReferralDialog", () => ({
  TransferReferralDialog: () => <button>Transferir</button>,
}));

import { PartnerReferralsTab } from "@/components/PartnerReferralsTab";
import { listReferralsForPartner } from "@/lib/data";

describe("PartnerReferralsTab", () => {
  it("renders empty state when no referrals", async () => {
    vi.mocked(listReferralsForPartner).mockResolvedValue([]);
    const ui = await PartnerReferralsTab({ partnerId: "p1", callerJwt: "jwt" });
    render(ui);
    expect(screen.getByText(/nenhum cliente indicado/i)).toBeInTheDocument();
  });

  it("renders referral row with email + active sub status", async () => {
    vi.mocked(listReferralsForPartner).mockResolvedValue([
      {
        referralId: "r1",
        customerUserId: "u1",
        customerEmail: "client@test.local",
        attributionSource: "affiliate_link",
        attributedAt: "2026-04-29T00:00:00Z",
        currentSub: { planId: "plan-active-id-here", status: "active" },
      },
    ]);
    const ui = await PartnerReferralsTab({ partnerId: "p1", callerJwt: "jwt" });
    render(ui);
    expect(screen.getByText("client@test.local")).toBeInTheDocument();
    expect(screen.getByText("affiliate_link")).toBeInTheDocument();
    expect(screen.getByText("active")).toBeInTheDocument();
  });

  it("falls back to UUID slice when email is null and shows 'sem plano' when no current sub", async () => {
    vi.mocked(listReferralsForPartner).mockResolvedValue([
      {
        referralId: "r2",
        customerUserId: "12345678-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
        customerEmail: null,
        attributionSource: "manual",
        attributedAt: "2026-04-29T00:00:00Z",
        currentSub: null,
      },
    ]);
    const ui = await PartnerReferralsTab({ partnerId: "p1", callerJwt: "jwt" });
    render(ui);
    expect(screen.getByText(/12345678/)).toBeInTheDocument();
    expect(screen.getByText(/sem plano/i)).toBeInTheDocument();
  });
});
