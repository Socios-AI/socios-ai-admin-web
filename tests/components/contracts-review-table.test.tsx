import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ContractsReviewTable } from "../../components/ContractsReviewTable";

vi.mock("../../app/_actions/contracts", () => ({
  approveAndSendContractAction: vi.fn(),
  rejectContractAction: vi.fn(),
}));

const rows = [
  { id: "c1", status: "pending_review", country: "BR", createdAt: "2026-07-04T00:00:00Z", email: "a@b.com", fullName: "Ana", previewUrl: "https://s/c1" },
];

describe("ContractsReviewTable", () => {
  it("lista o contrato com nome e botões de ação", () => {
    render(<ContractsReviewTable rows={rows} />);
    expect(screen.getByText("Ana")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Aprovar e enviar/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Ver PDF/i })).toHaveAttribute("href", "https://s/c1");
  });

  it("estado vazio quando não há contratos", () => {
    render(<ContractsReviewTable rows={[]} />);
    expect(screen.getByText(/Nenhum contrato aguardando/i)).toBeInTheDocument();
  });
});
