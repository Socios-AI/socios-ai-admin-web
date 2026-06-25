import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const { actionMock } = vi.hoisted(() => ({ actionMock: vi.fn() }));
vi.mock("../../app/_actions/mark-entry-fee-paid", () => ({ markEntryFeePaidAction: actionMock }));

import { MarkEntryFeePaidButton } from "../../components/MarkEntryFeePaidButton";

beforeEach(() => actionMock.mockReset());

describe("<MarkEntryFeePaidButton>", () => {
  it("calls the action with the partner id", async () => {
    actionMock.mockResolvedValue({ ok: true });
    render(<MarkEntryFeePaidButton partnerId="p9" />);
    fireEvent.click(screen.getByRole("button", { name: /marcar taxa de entrada paga/i }));
    await waitFor(() => expect(actionMock).toHaveBeenCalledWith({ partnerId: "p9" }));
  });
});
