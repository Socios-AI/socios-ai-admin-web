import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const { assignMock, cancelMock, refreshMock, toastSuccessMock, toastErrorMock } = vi.hoisted(() => ({
  assignMock: vi.fn(),
  cancelMock: vi.fn(),
  refreshMock: vi.fn(),
  toastSuccessMock: vi.fn(),
  toastErrorMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: refreshMock }),
}));

vi.mock("sonner", () => ({
  toast: { success: toastSuccessMock, error: toastErrorMock },
}));

vi.mock("../../app/_actions/assign-manual-subscription", () => ({
  assignManualSubscriptionAction: assignMock,
}));

vi.mock("../../app/_actions/cancel-subscription", () => ({
  cancelSubscriptionAction: cancelMock,
}));

import { PlansTab } from "../../components/PlansTab";

const userId = "11111111-1111-1111-1111-111111111111";

const monthlyPlan = {
  id: "p-monthly",
  slug: "case-pro",
  name: "Case Pro",
  billing_period: "monthly" as const,
  price_amount: 9900,
  currency: "brl" as const,
  app_slugs: ["case-predictor"],
};

const activeSub = {
  id: "sub-active",
  status: "manual" as const,
  started_at: "2026-04-25T00:00:00Z",
  current_period_end: "2026-05-25T00:00:00Z",
  canceled_at: null,
  notes: "Cortesia 1 mês",
  external_ref: null,
  plan: monthlyPlan,
  via: "user" as const,
  via_org_id: null,
  via_app_slug: null,
};

const canceledSub = {
  id: "sub-canceled",
  status: "canceled" as const,
  started_at: "2026-03-01T00:00:00Z",
  current_period_end: "2026-04-01T00:00:00Z",
  canceled_at: "2026-04-15T00:00:00Z",
  notes: null,
  external_ref: null,
  plan: monthlyPlan,
  via: "user" as const,
  via_org_id: null,
  via_app_slug: null,
};

const viaOrgSub = {
  id: "sub-org-1",
  status: "active" as const,
  started_at: "2026-03-01T00:00:00.000Z",
  current_period_end: "2026-12-31T00:00:00.000Z",
  canceled_at: null,
  external_ref: null,
  notes: null,
  plan: {
    id: "plan-team",
    slug: "team",
    name: "Team",
    billing_period: "yearly" as const,
    price_amount: 50000,
    currency: "brl" as const,
    app_slugs: ["case-predictor"],
  },
  via: "org" as const,
  via_org_id: "33333333-3333-3333-3333-333333333333",
  via_app_slug: "case-predictor",
};

const availablePlan = {
  id: "p-yearly",
  slug: "case-yearly",
  name: "Case Yearly",
  billing_period: "yearly" as const,
  price_amount: 99000,
  currency: "brl" as const,
  is_active: true,
};

beforeEach(() => {
  assignMock.mockClear();
  cancelMock.mockClear();
  refreshMock.mockClear();
  toastSuccessMock.mockClear();
  toastErrorMock.mockClear();
});

describe("PlansTab", () => {
  it("shows empty state when no subscriptions", () => {
    render(<PlansTab userId={userId} subscriptions={[]} availablePlans={[availablePlan]} />);
    expect(screen.getByText(/sem subscriptions/i)).toBeTruthy();
  });

  it("renders active and canceled in separate sections", () => {
    render(
      <PlansTab
        userId={userId}
        subscriptions={[activeSub, canceledSub]}
        availablePlans={[availablePlan]}
      />,
    );
    expect(screen.getByText(/ativas/i)).toBeTruthy();
    expect(screen.getByText(/encerradas/i)).toBeTruthy();
  });

  it("does not show cancel button on canceled rows", () => {
    render(
      <PlansTab
        userId={userId}
        subscriptions={[canceledSub]}
        availablePlans={[availablePlan]}
      />,
    );
    expect(screen.queryByText(/^cancelar$/i)).toBeNull();
  });

  it("clicking cancel opens ConfirmDialog requiring reason; confirm calls action", async () => {
    const user = userEvent.setup();
    cancelMock.mockResolvedValue({ ok: true });
    render(
      <PlansTab
        userId={userId}
        subscriptions={[activeSub]}
        availablePlans={[availablePlan]}
      />,
    );

    await user.click(screen.getByText(/^cancelar$/i));
    const reasonInput = screen.getByLabelText(/motivo/i);
    await user.type(reasonInput, "Cliente solicitou");
    await user.click(screen.getByRole("button", { name: /confirmar|cancelar subscription/i }));

    expect(cancelMock).toHaveBeenCalledWith({
      subscriptionId: "sub-active",
      reason: "Cliente solicitou",
    });
  });

  it("clicking 'Atribuir plano' opens AssignPlanDialog with availablePlans", async () => {
    const user = userEvent.setup();
    render(
      <PlansTab
        userId={userId}
        subscriptions={[]}
        availablePlans={[availablePlan]}
      />,
    );

    await user.click(screen.getByText(/atribuir plano/i));
    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(screen.getByText(/case yearly/i)).toBeTruthy();
  });

  it("on assign success, calls action with userId + planId and shows toast", async () => {
    const user = userEvent.setup();
    assignMock.mockResolvedValue({ ok: true, subscriptionId: "new-id" });

    render(
      <PlansTab
        userId={userId}
        subscriptions={[]}
        availablePlans={[availablePlan]}
      />,
    );

    await user.click(screen.getByText(/atribuir plano/i));
    await user.click(screen.getByText(/^atribuir$/i));

    expect(assignMock).toHaveBeenCalledWith(
      expect.objectContaining({
        userId,
        planId: "p-yearly",
      }),
    );
  });

  it("renders via-org row with link to org page", () => {
    render(
      <PlansTab
        userId="11111111-1111-1111-1111-111111111111"
        subscriptions={[viaOrgSub]}
        availablePlans={[]}
      />,
    );
    expect(screen.getByText("Team")).toBeInTheDocument();
    const links = screen.getAllByRole("link", { name: /Via org/i });
    const orgLink = links[0];
    expect(orgLink).toHaveAttribute(
      "href",
      "/orgs/33333333-3333-3333-3333-333333333333?app=case-predictor",
    );
  });

  it("hides cancel button on via-org rows", () => {
    render(
      <PlansTab
        userId="11111111-1111-1111-1111-111111111111"
        subscriptions={[viaOrgSub]}
        availablePlans={[]}
      />,
    );
    expect(screen.queryByRole("button", { name: "Cancelar" })).toBeNull();
  });
});
