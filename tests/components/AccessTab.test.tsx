import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const { grantMock, revokeMock, forceLogoutMock, refreshMock, toastSuccess, toastError } = vi.hoisted(() => ({
  grantMock: vi.fn(),
  revokeMock: vi.fn(),
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

vi.mock("../../app/_actions/grant-membership", () => ({
  grantMembershipAction: grantMock,
}));

vi.mock("../../app/_actions/revoke-membership", () => ({
  revokeMembershipAction: revokeMock,
}));

vi.mock("../../app/_actions/force-logout", () => ({
  forceLogoutAction: forceLogoutMock,
}));

import { AccessTab } from "../../components/AccessTab";

const userId = "11111111-1111-1111-1111-111111111111";
const apps = [{ slug: "case-predictor", name: "Case Predictor" }];

beforeEach(() => {
  grantMock.mockReset();
  revokeMock.mockReset();
  forceLogoutMock.mockReset();
  refreshMock.mockReset();
  toastSuccess.mockReset();
  toastError.mockReset();
});

describe("AccessTab", () => {
  it("shows empty state when no active memberships", () => {
    render(<AccessTab userId={userId} memberships={[]} apps={apps} />);
    expect(screen.getByText(/sem memberships ativas/i)).toBeTruthy();
  });

  it("filters out revoked memberships from the table", () => {
    render(
      <AccessTab
        userId={userId}
        memberships={[
          { id: "m1", app_slug: "case-predictor", role_slug: "tenant-admin", org_id: null, revoked_at: null },
          { id: "m2", app_slug: "lead-pro", role_slug: "end-user", org_id: null, revoked_at: "2026-04-20" },
        ]}
        apps={apps}
      />,
    );
    expect(screen.getByText("case-predictor")).toBeTruthy();
    expect(screen.queryByText("lead-pro")).toBeNull();
  });

  it("on grant success with suggestForceLogout, toast.success is called with action.label='Aplicar agora'", async () => {
    const user = userEvent.setup();
    grantMock.mockResolvedValue({
      ok: true,
      membershipId: "new-id",
      suggestForceLogout: true,
    });

    render(<AccessTab userId={userId} memberships={[]} apps={apps} />);

    await user.click(screen.getByText(/conceder acesso/i));
    // dialog opens; submit immediately with defaults
    await user.click(screen.getByText(/^conceder$/i));

    await waitFor(() => {
      expect(toastSuccess).toHaveBeenCalledWith(
        expect.stringMatching(/membership concedida/i),
        expect.objectContaining({
          action: expect.objectContaining({ label: "Aplicar agora" }),
        }),
      );
    });
  });

  it("clicking 'Aplicar agora' triggers forceLogoutAction with hardcoded reason", async () => {
    const user = userEvent.setup();
    grantMock.mockResolvedValue({
      ok: true,
      membershipId: "new-id",
      suggestForceLogout: true,
    });
    forceLogoutMock.mockResolvedValue({ ok: true });

    render(<AccessTab userId={userId} memberships={[]} apps={apps} />);

    await user.click(screen.getByText(/conceder acesso/i));
    await user.click(screen.getByText(/^conceder$/i));

    // Capture the action.onClick passed to toast and invoke it
    await waitFor(() => expect(toastSuccess).toHaveBeenCalled());
    const toastCall = toastSuccess.mock.calls[0];
    const action = toastCall[1].action;
    action.onClick();

    expect(forceLogoutMock).toHaveBeenCalledWith({
      userId,
      reason: "Aplicar mudança de acesso",
    });
  });

  it("on grant failure, shows error toast and does not show 'Aplicar agora' action", async () => {
    const user = userEvent.setup();
    grantMock.mockResolvedValue({ ok: false, error: "API_ERROR", message: "boom" });

    render(<AccessTab userId={userId} memberships={[]} apps={apps} />);

    await user.click(screen.getByText(/conceder acesso/i));
    await user.click(screen.getByText(/^conceder$/i));

    await waitFor(() => expect(toastError).toHaveBeenCalled());
    expect(toastSuccess).not.toHaveBeenCalled();
  });
});
