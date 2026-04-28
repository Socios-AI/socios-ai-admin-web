import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { OrgPlansSection } from "../../components/OrgPlansSection";

vi.mock("../../app/_actions/assign-manual-subscription", () => ({
  assignManualSubscriptionAction: vi.fn(),
}));
vi.mock("../../app/_actions/cancel-subscription", () => ({
  cancelSubscriptionAction: vi.fn(),
}));
vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

const sampleSub = {
  id: "s1",
  status: "active",
  started_at: "2026-04-01T00:00:00.000Z",
  current_period_end: "2026-12-31T00:00:00.000Z",
  canceled_at: null,
  external_ref: null,
  notes: null,
  plan: {
    id: "p1",
    slug: "team",
    name: "Team",
    billing_period: "yearly" as const,
    price_amount: 50000,
    currency: "brl" as const,
    apps: ["case-predictor"],
  },
};

describe("OrgPlansSection", () => {
  it("renders empty state when no active subs", () => {
    render(
      <OrgPlansSection
        orgId="org-A"
        appSlug="case-predictor"
        subscriptions={[]}
        availablePlans={[]}
      />,
    );
    expect(screen.getByText(/Nenhum plano ativo/i)).toBeInTheDocument();
  });

  it("renders active subscriptions table with cancel button", () => {
    render(
      <OrgPlansSection
        orgId="org-A"
        appSlug="case-predictor"
        subscriptions={[sampleSub]}
        availablePlans={[]}
      />,
    );
    expect(screen.getByText("Team")).toBeInTheDocument();
    expect(screen.getByText(/Cancelar/i)).toBeInTheDocument();
  });
});
