import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { AssignPlanDialog } from "../../components/AssignPlanDialog";

const onSubmit = vi.fn();
const onCancel = vi.fn();

const monthlyPlan = {
  id: "p-monthly",
  slug: "case-pro",
  name: "Case Pro",
  billing_period: "monthly" as const,
  price_amount: 9900,
  currency: "brl" as const,
};
const oneTimePlan = {
  id: "p-lifetime",
  slug: "lifetime",
  name: "Lifetime",
  billing_period: "one_time" as const,
  price_amount: 49900,
  currency: "usd" as const,
};
const customPlan = {
  id: "p-custom",
  slug: "enterprise",
  name: "Enterprise Custom",
  billing_period: "custom" as const,
  price_amount: 0,
  currency: "usd" as const,
};

beforeEach(() => {
  onSubmit.mockReset();
  onCancel.mockReset();
});

describe("AssignPlanDialog", () => {
  it("renders nothing when open=false", () => {
    const { container } = render(
      <AssignPlanDialog
        open={false}
        plans={[monthlyPlan]}
        onCancel={onCancel}
        onSubmit={onSubmit}
      />,
    );
    expect(container.querySelector("[role=dialog]")).toBeNull();
  });

  it("shows empty state with link to /plans/new when no plans available", () => {
    render(
      <AssignPlanDialog open plans={[]} onCancel={onCancel} onSubmit={onSubmit} />,
    );
    expect(screen.getByText(/nenhum plano ativo/i)).toBeTruthy();
    const link = screen.getByRole("link", { name: /criar plano/i });
    expect(link.getAttribute("href")).toBe("/plans/new");
  });

  it("pre-fills currentPeriodEnd ~30 days ahead for monthly plans", () => {
    render(
      <AssignPlanDialog
        open
        plans={[monthlyPlan]}
        onCancel={onCancel}
        onSubmit={onSubmit}
      />,
    );
    const input = screen.getByLabelText(/fim do período/i) as HTMLInputElement;
    expect(input.value).toMatch(/^\d{4}-\d{2}-\d{2}/);
    // Should be roughly 28-31 days ahead of today
    const inputDate = new Date(input.value);
    const diffDays = (inputDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    expect(diffDays).toBeGreaterThan(27);
    expect(diffDays).toBeLessThan(32);
  });

  it("leaves currentPeriodEnd empty for one_time plan", () => {
    render(
      <AssignPlanDialog
        open
        plans={[oneTimePlan]}
        onCancel={onCancel}
        onSubmit={onSubmit}
      />,
    );
    const input = screen.getByLabelText(/fim do período/i) as HTMLInputElement;
    expect(input.value).toBe("");
  });

  it("requires currentPeriodEnd for custom plan (input has required attribute)", () => {
    render(
      <AssignPlanDialog
        open
        plans={[customPlan]}
        onCancel={onCancel}
        onSubmit={onSubmit}
      />,
    );
    const input = screen.getByLabelText(/fim do período/i) as HTMLInputElement;
    expect(input.required).toBe(true);
  });

  it("submits with planId, currentPeriodEnd ISO, and trimmed notes", async () => {
    const user = userEvent.setup();
    render(
      <AssignPlanDialog
        open
        plans={[monthlyPlan]}
        onCancel={onCancel}
        onSubmit={onSubmit}
      />,
    );

    const notesInput = screen.getByLabelText(/observação/i);
    await user.type(notesInput, "Cortesia 1 mês");

    await user.click(screen.getByText(/^atribuir$/i));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        planId: "p-monthly",
        notes: "Cortesia 1 mês",
        currentPeriodEnd: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
      }),
    );
  });

  it("submits with currentPeriodEnd=null when one_time and field is empty", async () => {
    const user = userEvent.setup();
    render(
      <AssignPlanDialog
        open
        plans={[oneTimePlan]}
        onCancel={onCancel}
        onSubmit={onSubmit}
      />,
    );
    await user.click(screen.getByText(/^atribuir$/i));
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        planId: "p-lifetime",
        currentPeriodEnd: null,
      }),
    );
  });
});
