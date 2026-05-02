import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

const { forceLogoutMock, refreshMock, toastSuccess, toastError } = vi.hoisted(() => ({
  forceLogoutMock: vi.fn(),
  refreshMock: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: refreshMock }),
}));

vi.mock("sonner", () => ({
  toast: {
    success: toastSuccess,
    error: toastError,
  },
}));

vi.mock("../../app/_actions/force-logout", () => ({
  forceLogoutAction: forceLogoutMock,
}));

import { GlobalUserActions } from "../../components/GlobalUserActions";

beforeEach(() => {
  forceLogoutMock.mockReset();
  refreshMock.mockReset();
  toastSuccess.mockReset();
  toastError.mockReset();
});

describe("GlobalUserActions", () => {
  const baseProps = {
    userId: "11111111-1111-1111-1111-111111111111",
    email: "user@example.com",
    tier: null,
  };

  it("shows tier promotion buttons when tier=null", () => {
    render(<GlobalUserActions {...baseProps} tier={null} />);
    expect(screen.getByText("Promover a Owner")).toBeTruthy();
    expect(screen.getByText("Promover a Admin")).toBeTruthy();
    expect(screen.queryByText(/Demover/)).toBeNull();
  });

  it("shows 'Tier: Sem tier' badge when tier=null", () => {
    render(<GlobalUserActions {...baseProps} tier={null} />);
    expect(screen.getByText(/Tier: Sem tier/i)).toBeTruthy();
  });

  it("shows 'Tier: Owner' badge and Demover Owner when tier=owner", () => {
    render(<GlobalUserActions {...baseProps} tier="owner" />);
    expect(screen.getByText(/Tier: Owner/i)).toBeTruthy();
    expect(screen.getByText("Demover Owner")).toBeTruthy();
    expect(screen.queryByText("Promover a Owner")).toBeNull();
  });

  it("shows 'Tier: Admin' badge and Demover Admin when tier=admin", () => {
    render(<GlobalUserActions {...baseProps} tier="admin" />);
    expect(screen.getByText(/Tier: Admin/i)).toBeTruthy();
    expect(screen.getByText("Demover Admin")).toBeTruthy();
    expect(screen.getByText("Promover a Owner")).toBeTruthy();
  });

  it("does not show legacy 'Promover a super-admin' / 'Rebaixar (legacy)' buttons", () => {
    render(<GlobalUserActions {...baseProps} tier={null} />);
    expect(screen.queryByText(/super-admin \(legacy\)/i)).toBeNull();
    expect(screen.queryByText(/Rebaixar \(legacy\)/i)).toBeNull();
  });

  it("always shows 'Forçar logout'", () => {
    render(<GlobalUserActions {...baseProps} />);
    expect(screen.getByText(/forçar logout/i)).toBeTruthy();
  });
});
