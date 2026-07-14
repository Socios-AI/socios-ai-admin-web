import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { PartnerInviteForm } from "../../components/PartnerInviteForm";
import { createPartnerInviteAction } from "../../app/_actions/create-partner-invite";

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

  it("submit envia signatory_title digitado (não descarta o campo da F1)", async () => {
    const action = vi.mocked(createPartnerInviteAction);
    action.mockResolvedValue({ ok: true, invite_url: "https://x" });
    render(<PartnerInviteForm initialRole="licenciado" />);

    fireEvent.change(screen.getByLabelText(/Nome completo/i), { target: { value: "Ana Silva" } });
    fireEvent.change(screen.getByLabelText(/E-?mail/i), { target: { value: "ana@example.com" } });
    // PJ pra habilitar o campo de cargo do signatário.
    fireEvent.change(screen.getByLabelText(/Tipo de pessoa/i), { target: { value: "company" } });
    fireEvent.change(screen.getByLabelText(/Cargo de quem assina/i), { target: { value: "Sócia Administradora" } });
    fireEvent.change(screen.getByLabelText(/^CNPJ/i), { target: { value: "11444777000161" } });
    fireEvent.change(screen.getByLabelText(/Razão social/i), { target: { value: "Ana LTDA" } });
    fireEvent.change(screen.getByLabelText(/Responsável legal/i), { target: { value: "Ana Silva" } });
    fireEvent.change(screen.getByLabelText(/^CEP/i), { target: { value: "01310100" } });
    fireEvent.change(screen.getByLabelText(/Logradouro/i), { target: { value: "Av Paulista" } });
    fireEvent.change(screen.getByLabelText(/Cidade/i), { target: { value: "São Paulo" } });
    fireEvent.change(screen.getByLabelText(/^UF/i), { target: { value: "SP" } });

    fireEvent.submit(screen.getByRole("button", { name: /criar convite/i }).closest("form")!);
    await waitFor(() => expect(action).toHaveBeenCalled());
    const sent = action.mock.calls[0][0] as { contractProfile?: { signatory_title?: string } };
    expect(sent.contractProfile?.signatory_title).toBe("Sócia Administradora");
  });

  it("licenciado: campos obrigatórios do contrato marcados como required (trava F3)", () => {
    render(<PartnerInviteForm initialRole="licenciado" />);
    for (const label of [/^CPF \*/i, /^CEP \*/i, /Logradouro \*/i, /Cidade \*/i, /^UF \*/i]) {
      const el = screen.getByLabelText(label);
      expect(el).toBeRequired();
    }
    // Opcionais seguem sem required.
    expect(screen.getByLabelText(/Complemento/i)).not.toBeRequired();
  });
});
