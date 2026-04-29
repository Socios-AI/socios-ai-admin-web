import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { PartnerInvitationsList } from "../../components/PartnerInvitationsList";

const INV = {
  id: "i1",
  email: "jane@example.com",
  full_name: "Jane Doe",
  introduced_by_partner_id: null,
  invite_token: "tok",
  contract_envelope_id: "MOCK_ENVELOPE_i1",
  payment_link_url: "https://mock-stripe.local/pay/i1",
  custom_commission_pct: null,
  license_amount_usd: 10000,
  installments: 1,
  expires_at: "2026-05-01T00:00:00Z",
  consumed_at: null,
  status: "sent" as const,
  created_at: "2026-04-01T00:00:00Z",
};

describe("<PartnerInvitationsList>", () => {
  it("renders empty state when no pending invitations", () => {
    render(<PartnerInvitationsList invitations={[]} />);
    expect(screen.getByText(/nenhum convite pendente/i)).toBeInTheDocument();
  });
  it("renders invitation row with email and status", () => {
    render(<PartnerInvitationsList invitations={[INV]} />);
    expect(screen.getByText("jane@example.com")).toBeInTheDocument();
    expect(screen.getByText(/sent/i)).toBeInTheDocument();
  });
});
