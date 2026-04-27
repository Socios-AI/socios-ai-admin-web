import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const { promoteMock, demoteMock, forceLogoutMock, refreshMock, toastSuccess, toastError } = vi.hoisted(() => ({
  promoteMock: vi.fn(),
  demoteMock: vi.fn(),
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

vi.mock("../../app/_actions/promote-user", () => ({
  promoteUserAction: promoteMock,
}));

vi.mock("../../app/_actions/demote-user", () => ({
  demoteUserAction: demoteMock,
}));

vi.mock("../../app/_actions/force-logout", () => ({
  forceLogoutAction: forceLogoutMock,
}));

import { GlobalUserActions } from "../../components/GlobalUserActions";

beforeEach(() => {
  promoteMock.mockReset();
  demoteMock.mockReset();
  forceLogoutMock.mockReset();
  refreshMock.mockReset();
  toastSuccess.mockReset();
  toastError.mockReset();
});

describe("GlobalUserActions", () => {
  const baseProps = {
    userId: "11111111-1111-1111-1111-111111111111",
    email: "user@example.com",
  };

  it("shows 'Promover' for non-super-admin and 'Rebaixar' for super-admin", () => {
    const { rerender } = render(
      <GlobalUserActions {...baseProps} isSuperAdmin={false} />,
    );
    expect(screen.getByText(/promover/i)).toBeTruthy();
    expect(screen.queryByText(/^rebaixar$/i)).toBeNull();

    rerender(<GlobalUserActions {...baseProps} isSuperAdmin={true} />);
    expect(screen.queryByText(/promover/i)).toBeNull();
    expect(screen.getByText(/rebaixar/i)).toBeTruthy();
  });

  it("always shows 'Forçar logout'", () => {
    render(<GlobalUserActions {...baseProps} isSuperAdmin={false} />);
    expect(screen.getByText(/forçar logout/i)).toBeTruthy();
  });
});
