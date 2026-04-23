import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ConfirmDialog } from "../../components/ConfirmDialog";

describe("ConfirmDialog", () => {
  it("renders title and prompts for reason when requireReason=true", () => {
    render(
      <ConfirmDialog
        open
        title="Promover"
        description="Promove user@example.com a super-admin."
        requireReason
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    expect(screen.getByText("Promover")).toBeInTheDocument();
    expect(screen.getByLabelText(/Motivo/i)).toBeInTheDocument();
  });

  it("disables confirm button until reason has 5+ chars", () => {
    render(
      <ConfirmDialog
        open
        title="Demote"
        description="Demote this user."
        requireReason
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    const confirm = screen.getByRole("button", { name: /confirmar/i });
    expect(confirm).toBeDisabled();

    fireEvent.change(screen.getByLabelText(/Motivo/i), { target: { value: "abcd" } });
    expect(confirm).toBeDisabled();

    fireEvent.change(screen.getByLabelText(/Motivo/i), { target: { value: "abcde" } });
    expect(confirm).toBeEnabled();
  });

  it("calls onConfirm with reason when submitted", async () => {
    const onConfirm = vi.fn();
    render(
      <ConfirmDialog
        open
        title="Force logout"
        description="Revoke all sessions."
        requireReason
        confirmLabel="Revogar"
        onConfirm={onConfirm}
        onCancel={vi.fn()}
      />,
    );
    fireEvent.change(screen.getByLabelText(/Motivo/i), { target: { value: "violated terms" } });
    fireEvent.click(screen.getByRole("button", { name: /revogar/i }));

    await waitFor(() => {
      expect(onConfirm).toHaveBeenCalledWith("violated terms");
    });
  });

  it("calls onCancel when cancel button clicked", () => {
    const onCancel = vi.fn();
    render(
      <ConfirmDialog
        open
        title="Promover"
        description="Promote."
        onConfirm={vi.fn()}
        onCancel={onCancel}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /cancelar/i }));
    expect(onCancel).toHaveBeenCalled();
  });
});
