import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const { revokeMock, refreshMock } = vi.hoisted(() => ({
  revokeMock: vi.fn(),
  refreshMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: refreshMock }),
}));

vi.mock("@/app/_actions/revoke-referral", () => ({
  revokeReferralAction: revokeMock,
}));

import { RevokeReferralDialog } from "@/components/RevokeReferralDialog";

beforeEach(() => {
  revokeMock.mockReset();
  refreshMock.mockReset();
});

describe("RevokeReferralDialog", () => {
  it("renders trigger button and is closed initially", () => {
    render(<RevokeReferralDialog referralId="r1" />);
    expect(screen.getByRole("button", { name: /revogar/i })).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("clicking trigger opens dialog with destructive copy", async () => {
    const user = userEvent.setup();
    render(<RevokeReferralDialog referralId="r1" />);
    await user.click(screen.getByRole("button", { name: /revogar/i }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText(/não pode ser desfeita/i)).toBeInTheDocument();
  });

  it("happy path: confirm calls action and refreshes", async () => {
    const user = userEvent.setup();
    revokeMock.mockResolvedValue({ ok: true });
    render(<RevokeReferralDialog referralId="r1" />);

    await user.click(screen.getByRole("button", { name: /revogar/i }));
    // ConfirmDialog has its own "Revogar" confirm button (custom label)
    const buttons = screen.getAllByRole("button", { name: /revogar/i });
    // First is trigger (still in DOM), second is confirm inside dialog
    await user.click(buttons[buttons.length - 1]);

    await waitFor(() => {
      expect(revokeMock).toHaveBeenCalledWith({ referralId: "r1" });
    });
    await waitFor(() => {
      expect(refreshMock).toHaveBeenCalled();
    });
  });

  it("error path: surfaces server error message", async () => {
    const user = userEvent.setup();
    revokeMock.mockResolvedValue({
      ok: false,
      error: "CONFLICT",
      message: "Atribuição travada por assinatura paga",
    });
    render(<RevokeReferralDialog referralId="r1" />);

    await user.click(screen.getByRole("button", { name: /revogar/i }));
    const buttons = screen.getAllByRole("button", { name: /revogar/i });
    await user.click(buttons[buttons.length - 1]);

    await waitFor(() => {
      expect(screen.getByText(/atribuição travada/i)).toBeInTheDocument();
    });
    expect(refreshMock).not.toHaveBeenCalled();
  });
});
