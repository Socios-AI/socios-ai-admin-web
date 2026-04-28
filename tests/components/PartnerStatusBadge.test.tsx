import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { PartnerStatusBadge } from "../../components/PartnerStatusBadge";

describe("<PartnerStatusBadge>", () => {
  it("renders Português label for active", () => {
    render(<PartnerStatusBadge status="active" />);
    expect(screen.getByText("Ativo")).toBeInTheDocument();
  });
  it("renders pending_contract label", () => {
    render(<PartnerStatusBadge status="pending_contract" />);
    expect(screen.getByText("Aguardando contrato")).toBeInTheDocument();
  });
  it("applies success variant class on active", () => {
    const { container } = render(<PartnerStatusBadge status="active" />);
    expect(container.firstChild).toHaveAttribute("data-variant", "success");
  });
  it("applies destructive variant on terminated", () => {
    const { container } = render(<PartnerStatusBadge status="terminated" />);
    expect(container.firstChild).toHaveAttribute("data-variant", "destructive");
  });
});
