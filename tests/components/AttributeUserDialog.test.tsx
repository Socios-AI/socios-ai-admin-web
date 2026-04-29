import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const { findMock, attributeMock, refreshMock } = vi.hoisted(() => ({
  findMock: vi.fn(),
  attributeMock: vi.fn(),
  refreshMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: refreshMock }),
}));

vi.mock("@/app/_actions/find-user-for-attribution", () => ({
  findUserForAttributionAction: findMock,
}));

vi.mock("@/app/_actions/attribute-referral", () => ({
  attributeReferralAction: attributeMock,
}));

import { AttributeUserDialog } from "@/components/AttributeUserDialog";

const PARTNER_ID = "11111111-1111-1111-1111-111111111111";

beforeEach(() => {
  findMock.mockReset();
  attributeMock.mockReset();
  refreshMock.mockReset();
});

describe("AttributeUserDialog", () => {
  it("trigger button opens dialog", async () => {
    const user = userEvent.setup();
    render(<AttributeUserDialog partnerId={PARTNER_ID} />);
    expect(screen.queryByPlaceholderText(/cliente@exemplo/i)).toBeNull();

    await user.click(screen.getByRole("button", { name: /atribuir cliente/i }));
    expect(screen.getByPlaceholderText(/cliente@exemplo/i)).toBeInTheDocument();
  });

  it("search miss surfaces 'usuário não encontrado'", async () => {
    const user = userEvent.setup();
    findMock.mockResolvedValue({ ok: true, result: null });

    render(<AttributeUserDialog partnerId={PARTNER_ID} />);
    await user.click(screen.getByRole("button", { name: /atribuir cliente/i }));
    await user.type(screen.getByPlaceholderText(/cliente@exemplo/i), "no@user.local");
    await user.click(screen.getByRole("button", { name: /buscar/i }));

    await waitFor(() => {
      expect(screen.getByText(/usuário não encontrado/i)).toBeInTheDocument();
    });
  });

  it("search hit + attribute success calls action and refreshes", async () => {
    const user = userEvent.setup();
    findMock.mockResolvedValue({
      ok: true,
      result: {
        userId: "u1",
        email: "client@test.local",
        hasReferral: false,
        currentReferral: null,
      },
    });
    attributeMock.mockResolvedValue({ ok: true, referralId: "r-new" });

    render(<AttributeUserDialog partnerId={PARTNER_ID} />);
    await user.click(screen.getByRole("button", { name: /atribuir cliente/i }));
    await user.type(screen.getByPlaceholderText(/cliente@exemplo/i), "client@test.local");
    await user.click(screen.getByRole("button", { name: /buscar/i }));

    await waitFor(() => {
      expect(screen.getByText("client@test.local")).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: /confirmar atribuição/i }));

    await waitFor(() => {
      expect(attributeMock).toHaveBeenCalledWith({
        customerUserId: "u1",
        sourcePartnerId: PARTNER_ID,
        attributionSource: "admin_assignment",
      });
    });
    await waitFor(() => {
      expect(refreshMock).toHaveBeenCalled();
    });
  });

  it("search hit but already-attributed shows transfer hint and no confirm button", async () => {
    const user = userEvent.setup();
    findMock.mockResolvedValue({
      ok: true,
      result: {
        userId: "u2",
        email: "owned@test.local",
        hasReferral: true,
        currentReferral: {
          partnerId: "33333333-3333-3333-3333-333333333333",
          partnerLabel: "33333333",
        },
      },
    });

    render(<AttributeUserDialog partnerId={PARTNER_ID} />);
    await user.click(screen.getByRole("button", { name: /atribuir cliente/i }));
    await user.type(screen.getByPlaceholderText(/cliente@exemplo/i), "owned@test.local");
    await user.click(screen.getByRole("button", { name: /buscar/i }));

    await waitFor(() => {
      expect(screen.getByText(/já atribuído a/i)).toBeInTheDocument();
    });
    expect(screen.queryByRole("button", { name: /confirmar atribuição/i })).toBeNull();
    expect(attributeMock).not.toHaveBeenCalled();
  });
});
