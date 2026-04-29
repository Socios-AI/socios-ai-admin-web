import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { PartnerListTable } from "../../components/PartnerListTable";

const ROW = {
  id: "p1",
  user_id: "u1",
  status: "active" as const,
  introduced_by_partner_id: null,
  custom_commission_pct: 0.5,
  stripe_connect_account_id: null,
  contract_signed_at: null,
  contract_envelope_id: null,
  license_paid_at: null,
  license_amount_paid_usd: null,
  kyc_completed_at: null,
  activated_at: "2026-04-01T00:00:00Z",
  suspended_at: null,
  termination_reason: null,
  metadata: {},
  created_at: "2026-04-01T00:00:00Z",
  updated_at: "2026-04-01T00:00:00Z",
};

describe("<PartnerListTable>", () => {
  it("renders empty state when no partners", () => {
    render(<PartnerListTable partners={[]} />);
    expect(screen.getByText(/nenhum licenciado/i)).toBeInTheDocument();
  });
  it("renders rows with status badge", () => {
    render(<PartnerListTable partners={[ROW]} />);
    expect(screen.getByText("Ativo")).toBeInTheDocument();
  });
  it("links to partner detail page", () => {
    render(<PartnerListTable partners={[ROW]} />);
    const link = screen.getByRole("link", { name: /detalhes/i });
    expect(link).toHaveAttribute("href", "/partners/p1");
  });
});
