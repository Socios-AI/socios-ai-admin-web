import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const { transferMock, refreshMock } = vi.hoisted(() => ({
  transferMock: vi.fn(),
  refreshMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: refreshMock }),
}));

vi.mock("@/app/_actions/transfer-referral", () => ({
  transferReferralAction: transferMock,
}));

import { TransferReferralDialog } from "@/components/TransferReferralDialog";

const FROM = "11111111-1111-1111-1111-111111111111";
const TO = "22222222-2222-2222-2222-222222222222";

beforeEach(() => {
  transferMock.mockReset();
  refreshMock.mockReset();
});

describe("TransferReferralDialog", () => {
  it("renders trigger button and is closed initially", () => {
    render(<TransferReferralDialog referralId="r1" fromPartnerId={FROM} />);
    expect(screen.getByRole("button", { name: /transferir/i })).toBeInTheDocument();
    expect(screen.queryByPlaceholderText(/uuid-uuid/i)).toBeNull();
  });

  it("opens dialog showing origin partner slice when clicked", async () => {
    const user = userEvent.setup();
    render(<TransferReferralDialog referralId="r1" fromPartnerId={FROM} />);
    await user.click(screen.getByRole("button", { name: /transferir/i }));
    expect(screen.getByText(/transferir indicação/i)).toBeInTheDocument();
    expect(screen.getByText(FROM.slice(0, 8) + "...")).toBeInTheDocument();
  });

  it("happy path: typing UUID and clicking transfer calls action and refreshes", async () => {
    const user = userEvent.setup();
    transferMock.mockResolvedValue({ ok: true });
    render(<TransferReferralDialog referralId="r1" fromPartnerId={FROM} />);

    await user.click(screen.getByRole("button", { name: /transferir/i }));
    const input = screen.getByPlaceholderText(/uuid-uuid/i);
    await user.type(input, TO);

    const dialogButtons = screen.getAllByRole("button", { name: /transferir/i });
    // The trigger remains in DOM; the inner "Transferir" submit button is the last one.
    await user.click(dialogButtons[dialogButtons.length - 1]);

    await waitFor(() => {
      expect(transferMock).toHaveBeenCalledWith({
        referralId: "r1",
        toPartnerId: TO,
      });
    });
    await waitFor(() => {
      expect(refreshMock).toHaveBeenCalled();
    });
  });

  it("error path: shows server error message and does not refresh", async () => {
    const user = userEvent.setup();
    transferMock.mockResolvedValue({
      ok: false,
      error: "CONFLICT",
      message: "Licenciado de destino não está ativo.",
    });
    render(<TransferReferralDialog referralId="r1" fromPartnerId={FROM} />);

    await user.click(screen.getByRole("button", { name: /transferir/i }));
    const input = screen.getByPlaceholderText(/uuid-uuid/i);
    await user.type(input, TO);
    const dialogButtons = screen.getAllByRole("button", { name: /transferir/i });
    await user.click(dialogButtons[dialogButtons.length - 1]);

    await waitFor(() => {
      expect(screen.getByText(/destino não está ativo/i)).toBeInTheDocument();
    });
    expect(refreshMock).not.toHaveBeenCalled();
  });
});
