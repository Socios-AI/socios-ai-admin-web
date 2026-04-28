import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const { suspendMock, terminateMock, refreshMock, toastSuccess, toastError } = vi.hoisted(() => ({
  suspendMock: vi.fn(),
  terminateMock: vi.fn(),
  refreshMock: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}));

vi.mock("../../app/_actions/suspend-partner", () => ({
  suspendPartnerAction: suspendMock,
}));

vi.mock("../../app/_actions/terminate-partner", () => ({
  terminatePartnerAction: terminateMock,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: refreshMock }),
}));

vi.mock("sonner", () => ({
  toast: { success: toastSuccess, error: toastError },
}));

import { PartnerActionsMenu } from "../../components/PartnerActionsMenu";

beforeEach(() => {
  suspendMock.mockReset();
  terminateMock.mockReset();
  refreshMock.mockReset();
  toastSuccess.mockReset();
  toastError.mockReset();
});

describe("<PartnerActionsMenu>", () => {
  it("opens menu and triggers suspend with reason", async () => {
    suspendMock.mockResolvedValue({ ok: true });
    render(<PartnerActionsMenu partnerId="p1" status="active" />);
    await userEvent.click(screen.getByRole("button", { name: /ações/i }));
    // Click the menu item (only one "Suspender" button before dialog opens).
    await userEvent.click(screen.getByRole("button", { name: /suspender/i }));
    await userEvent.type(screen.getByLabelText(/motivo/i), "Inatividade prolongada");
    // Now there are 2 buttons matching /suspender/i: the still-open menu item and the dialog confirm.
    // Pick the one inside the dialog.
    const dialog = screen.getByRole("dialog");
    await userEvent.click(within(dialog).getByRole("button", { name: /suspender/i }));
    expect(suspendMock).toHaveBeenCalledWith({ partnerId: "p1", reason: "Inatividade prolongada" });
  });

  it("hides suspend and terminate options for terminated partner", async () => {
    render(<PartnerActionsMenu partnerId="p1" status="terminated" />);
    await userEvent.click(screen.getByRole("button", { name: /ações/i }));
    expect(screen.queryByRole("button", { name: /suspender/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /encerrar/i })).not.toBeInTheDocument();
  });
});
