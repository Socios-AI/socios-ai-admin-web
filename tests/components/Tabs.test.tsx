import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const replaceMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: replaceMock }),
  usePathname: () => "/users/abc",
}));

import { TabNav } from "../../components/Tabs";

beforeEach(() => {
  replaceMock.mockReset();
});

const items = [
  { key: "access", label: "Acesso" },
  { key: "plans", label: "Planos" },
  { key: "audit", label: "Auditoria" },
];

describe("TabNav", () => {
  it("renders all tabs with correct aria-selected based on active prop", () => {
    render(<TabNav items={items} active="plans" />);

    const accessTab = screen.getByRole("tab", { name: "Acesso" });
    const plansTab = screen.getByRole("tab", { name: "Planos" });
    const auditTab = screen.getByRole("tab", { name: "Auditoria" });

    expect(accessTab.getAttribute("aria-selected")).toBe("false");
    expect(plansTab.getAttribute("aria-selected")).toBe("true");
    expect(auditTab.getAttribute("aria-selected")).toBe("false");
  });

  it("clicking a tab calls router.replace with ?tab=KEY and scroll: false", async () => {
    const user = userEvent.setup();
    render(<TabNav items={items} active="access" />);

    await user.click(screen.getByRole("tab", { name: "Planos" }));

    expect(replaceMock).toHaveBeenCalledWith("/users/abc?tab=plans", { scroll: false });
  });

  it("clicking the active tab still calls replace (no-op safe)", async () => {
    const user = userEvent.setup();
    render(<TabNav items={items} active="access" />);

    await user.click(screen.getByRole("tab", { name: "Acesso" }));

    expect(replaceMock).toHaveBeenCalledWith("/users/abc?tab=access", { scroll: false });
  });
});
