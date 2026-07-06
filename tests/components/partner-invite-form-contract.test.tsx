import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { PartnerInviteForm } from "../../components/PartnerInviteForm";

vi.mock("../../app/_actions/create-partner-invite", () => ({ createPartnerInviteAction: vi.fn() }));
vi.mock("../../app/_actions/search-partners", () => ({}));

describe("PartnerInviteForm · contrato", () => {
  it("mostra campos do contrato quando papel é licenciado", () => {
    render(<PartnerInviteForm initialRole="licenciado" />);
    expect(screen.getByText(/Dados do contrato/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Valor da licença/i)).toBeInTheDocument();
  });

  it("esconde campos do contrato para representante", () => {
    render(<PartnerInviteForm initialRole="representante" />);
    expect(screen.queryByText(/Dados do contrato/i)).not.toBeInTheDocument();
  });
});
