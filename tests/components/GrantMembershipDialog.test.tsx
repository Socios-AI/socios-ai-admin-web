import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { GrantMembershipDialog } from "../../components/GrantMembershipDialog";

const onSubmit = vi.fn();
const onCancel = vi.fn();

beforeEach(() => {
  onSubmit.mockReset();
  onCancel.mockReset();
});

// beauty = 1 papel (org_admin) + nichos. platform = 2 papéis, sem nicho.
type TestApp = {
  slug: string;
  name: string;
  role_catalog: Record<string, string>;
  niche_catalog: Record<string, string>;
};
const apps: TestApp[] = [
  {
    slug: "beauty",
    name: "Beauty",
    role_catalog: { org_admin: "Owner / Org Admin" },
    niche_catalog: { salao_beleza: "Salão de Beleza", barbearia: "Barbearia" },
  },
  {
    slug: "platform",
    name: "Platform",
    role_catalog: { org_admin: "Org Admin", org_user: "Org User" },
    niche_catalog: {},
  },
  {
    slug: "case-predictor",
    name: "Case Predictor",
    role_catalog: { "case-predictor-admin": "CP Admin" },
    niche_catalog: {},
  },
];

const nicheOrgs = [
  { id: "org-salao", name: "Salão A", niche: "salao_beleza" },
  { id: "org-barber", name: "Barber B", niche: "barbearia" },
];

function renderDialog() {
  return render(
    <GrantMembershipDialog
      open
      onCancel={onCancel}
      onSubmit={onSubmit}
      apps={apps}
      nicheOrgs={nicheOrgs}
    />,
  );
}

describe("GrantMembershipDialog", () => {
  it("renders form when open=true", () => {
    renderDialog();
    expect(screen.getByText(/conceder membership/i)).toBeTruthy();
    expect(screen.getByLabelText(/app/i)).toBeTruthy();
  });

  it("renders nothing when open=false", () => {
    const { container } = render(
      <GrantMembershipDialog
        open={false}
        onCancel={onCancel}
        onSubmit={onSubmit}
        apps={apps}
        nicheOrgs={nicheOrgs}
      />,
    );
    expect(container.querySelector("[role=dialog]")).toBeNull();
  });

  it("hides the role dropdown for a single-role app (beauty) and shows the role statically", () => {
    renderDialog();
    // No combobox associated with the "Papel" label · it renders as static text.
    expect(screen.queryByLabelText(/papel/i)).toBeNull();
    expect(screen.getByText(/owner \/ org admin/i)).toBeTruthy();
  });

  it("shows a role dropdown for a multi-role app (platform)", async () => {
    const user = userEvent.setup();
    renderDialog();
    await user.selectOptions(screen.getByLabelText(/app/i), "platform");
    const roleSelect = screen.getByLabelText(/papel/i);
    expect(roleSelect).toBeTruthy();
    expect(within(roleSelect as HTMLElement).getByRole("option", { name: /org user/i })).toBeTruthy();
    // platform não é multi-nicho → campo Org ID livre, sem seletor de conta.
    expect(screen.getByLabelText(/org id/i)).toBeTruthy();
  });

  it("for a niche app, lists existing tenants (no niche step) as an optional account", () => {
    renderDialog();
    expect(screen.queryByLabelText(/nicho/i)).toBeNull();
    const orgSelect = screen.getByLabelText(/conta/i) as HTMLElement;
    // Lista TODAS as contas existentes (sem filtrar por nicho), rotuladas.
    expect(within(orgSelect).getByRole("option", { name: /Salão A/ })).toBeTruthy();
    expect(within(orgSelect).getByRole("option", { name: /Barber B/ })).toBeTruthy();
    expect(within(orgSelect).getByRole("option", { name: /sem conta/i })).toBeTruthy();
  });

  it("submits appSlug + auto role + chosen org for a niche app", async () => {
    const user = userEvent.setup();
    renderDialog();
    await user.selectOptions(screen.getByLabelText(/conta/i), "org-salao");
    await user.click(screen.getByRole("button", { name: /^conceder$/i }));

    expect(onSubmit).toHaveBeenCalledWith({
      appSlug: "beauty",
      roleSlug: "org_admin",
      orgId: "org-salao",
    });
  });

  it("allows granting a niche app with no account (app-level access)", async () => {
    const user = userEvent.setup();
    renderDialog();
    await user.click(screen.getByRole("button", { name: /^conceder$/i }));

    expect(onSubmit).toHaveBeenCalledWith({
      appSlug: "beauty",
      roleSlug: "org_admin",
      orgId: undefined,
    });
  });

  it("submits a non-niche single-role app with optional org id omitted", async () => {
    const user = userEvent.setup();
    renderDialog();
    await user.selectOptions(screen.getByLabelText(/app/i), "case-predictor");
    await user.click(screen.getByRole("button", { name: /^conceder$/i }));

    expect(onSubmit).toHaveBeenCalledWith({
      appSlug: "case-predictor",
      roleSlug: "case-predictor-admin",
      orgId: undefined,
    });
  });
});
