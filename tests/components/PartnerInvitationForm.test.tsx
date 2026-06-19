import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const { actionMock } = vi.hoisted(() => ({ actionMock: vi.fn() }));
vi.mock("../../app/_actions/create-partner-invitation", () => ({
  createPartnerInvitationAction: actionMock,
}));

import { PartnerInvitationForm } from "../../components/PartnerInvitationForm";

describe("<PartnerInvitationForm>", () => {
  it("submits valid input", async () => {
    actionMock.mockResolvedValue({
      ok: true, id: "i1",
      invite_url: "https://partners.sociosai.com/onboarding/tok",
      mocked_dropbox_sign: true, mocked_stripe_connect: true,
    });
    render(<PartnerInvitationForm />);
    await userEvent.type(screen.getByLabelText(/email/i), "jane@example.com");
    await userEvent.type(screen.getByLabelText(/nome completo/i), "Jane Doe");
    await userEvent.clear(screen.getByLabelText(/valor da licença/i));
    await userEvent.type(screen.getByLabelText(/valor da licença/i), "10000");
    await userEvent.click(screen.getByRole("button", { name: /enviar convite/i }));
    expect(actionMock).toHaveBeenCalledWith(expect.objectContaining({
      email: "jane@example.com", fullName: "Jane Doe", licenseAmountUsd: 10000,
    }));
  });

  it("inclui introducedByPartnerId quando um recrutador é escolhido", async () => {
    actionMock.mockResolvedValue({
      ok: true, id: "i1",
      invite_url: "https://partners.sociosai.com/onboarding/tok",
      mocked_dropbox_sign: true, mocked_stripe_connect: true,
    });
    render(
      <PartnerInvitationForm
        recruiters={[{ id: "11111111-1111-1111-1111-111111111111", label: "Licenciado A · Licenciado" }]}
      />,
    );
    await userEvent.type(screen.getByLabelText(/email/i), "jane@example.com");
    await userEvent.type(screen.getByLabelText(/nome completo/i), "Jane Doe");
    await userEvent.clear(screen.getByLabelText(/valor da licença/i));
    await userEvent.type(screen.getByLabelText(/valor da licença/i), "10000");
    await userEvent.selectOptions(
      screen.getByLabelText(/recrutador/i),
      "11111111-1111-1111-1111-111111111111",
    );
    await userEvent.click(screen.getByRole("button", { name: /enviar convite/i }));
    expect(actionMock).toHaveBeenCalledWith(expect.objectContaining({
      introducedByPartnerId: "11111111-1111-1111-1111-111111111111",
    }));
  });

  it("sem recrutador escolhido, introducedByPartnerId fica undefined (raiz)", async () => {
    actionMock.mockResolvedValue({
      ok: true, id: "i2",
      invite_url: "https://partners.sociosai.com/onboarding/tok2",
      mocked_dropbox_sign: true, mocked_stripe_connect: true,
    });
    render(
      <PartnerInvitationForm
        recruiters={[{ id: "11111111-1111-1111-1111-111111111111", label: "Licenciado A · Licenciado" }]}
      />,
    );
    await userEvent.type(screen.getByLabelText(/email/i), "bob@example.com");
    await userEvent.type(screen.getByLabelText(/nome completo/i), "Bob");
    await userEvent.clear(screen.getByLabelText(/valor da licença/i));
    await userEvent.type(screen.getByLabelText(/valor da licença/i), "10000");
    await userEvent.click(screen.getByRole("button", { name: /enviar convite/i }));
    expect(actionMock).toHaveBeenCalledWith(expect.objectContaining({
      introducedByPartnerId: undefined,
    }));
  });

  it("shows server error on FORBIDDEN", async () => {
    actionMock.mockResolvedValue({ ok: false, error: "FORBIDDEN" });
    render(<PartnerInvitationForm />);
    await userEvent.type(screen.getByLabelText(/email/i), "jane@example.com");
    await userEvent.type(screen.getByLabelText(/nome completo/i), "Jane");
    await userEvent.clear(screen.getByLabelText(/valor da licença/i));
    await userEvent.type(screen.getByLabelText(/valor da licença/i), "1000");
    await userEvent.click(screen.getByRole("button", { name: /enviar convite/i }));
    expect(await screen.findByText(/sem permiss/i)).toBeInTheDocument();
  });
});
