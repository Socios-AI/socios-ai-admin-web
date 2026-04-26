import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { GrantMembershipDialog } from "../../components/GrantMembershipDialog";

const onSubmit = vi.fn();
const onCancel = vi.fn();

beforeEach(() => {
  onSubmit.mockReset();
  onCancel.mockReset();
});

const apps = [
  { slug: "case-predictor", name: "Case Predictor" },
  { slug: "lead-pro", name: "Lead Pro" },
];

describe("GrantMembershipDialog", () => {
  it("renders form when open=true", () => {
    render(
      <GrantMembershipDialog open onCancel={onCancel} onSubmit={onSubmit} apps={apps} />,
    );
    expect(screen.getByText(/conceder membership/i)).toBeTruthy();
    expect(screen.getByLabelText(/app/i)).toBeTruthy();
    expect(screen.getByLabelText(/role/i)).toBeTruthy();
  });

  it("renders nothing when open=false", () => {
    const { container } = render(
      <GrantMembershipDialog
        open={false}
        onCancel={onCancel}
        onSubmit={onSubmit}
        apps={apps}
      />,
    );
    expect(container.querySelector("[role=dialog]")).toBeNull();
  });

  it("shows org_id field only for roles that require org", async () => {
    const user = userEvent.setup();
    render(
      <GrantMembershipDialog open onCancel={onCancel} onSubmit={onSubmit} apps={apps} />,
    );

    // Default role is end-user (no org)
    expect(screen.queryByLabelText(/org id/i)).toBeNull();

    // Switch to partner-admin (requires org)
    const roleSelect = screen.getByLabelText(/role/i);
    await user.selectOptions(roleSelect, "partner-admin");
    expect(screen.getByLabelText(/org id/i)).toBeTruthy();
  });

  it("calls onSubmit with selected app/role/orgId on submit", async () => {
    const user = userEvent.setup();
    render(
      <GrantMembershipDialog open onCancel={onCancel} onSubmit={onSubmit} apps={apps} />,
    );

    await user.selectOptions(screen.getByLabelText(/app/i), "lead-pro");
    await user.click(screen.getByRole("button", { name: /^conceder$/i }));

    expect(onSubmit).toHaveBeenCalledWith({
      appSlug: "lead-pro",
      roleSlug: "end-user",
      orgId: undefined,
    });
  });
});
