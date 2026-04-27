import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const { pushMock } = vi.hoisted(() => ({ pushMock: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

import { AuditFilters } from "../../components/AuditFilters";

const apps = [
  { slug: "case-predictor", name: "Case Predictor" },
  { slug: "lead-pro", name: "Lead Pro" },
];

beforeEach(() => {
  pushMock.mockReset();
});

describe("AuditFilters", () => {
  it("renders all 5 filter inputs", () => {
    render(<AuditFilters apps={apps} initial={{}} />);
    expect(screen.getByLabelText(/evento/i)).toBeTruthy();
    expect(screen.getByLabelText(/app/i)).toBeTruthy();
    expect(screen.getByLabelText(/ator/i)).toBeTruthy();
    expect(screen.getByLabelText(/alvo/i)).toBeTruthy();
    expect(screen.getByText(/hoje/i)).toBeTruthy();
  });

  it("pre-fills inputs from `initial`", () => {
    render(
      <AuditFilters
        apps={apps}
        initial={{ event_type: "plan.updated", actor: "ana", app_slug: "case-predictor" }}
      />,
    );
    expect((screen.getByLabelText(/evento/i) as HTMLSelectElement).value).toBe("plan.updated");
    expect((screen.getByLabelText(/ator/i) as HTMLInputElement).value).toBe("ana");
    expect((screen.getByLabelText(/app/i) as HTMLSelectElement).value).toBe("case-predictor");
  });

  it("submit pushes /audit?... with serialized filters", async () => {
    const user = userEvent.setup();
    render(<AuditFilters apps={apps} initial={{}} />);

    await user.selectOptions(screen.getByLabelText(/evento/i), "plan.updated");
    await user.type(screen.getByLabelText(/ator/i), "ana");
    await user.click(screen.getByRole("button", { name: /aplicar/i }));

    expect(pushMock).toHaveBeenCalledTimes(1);
    const arg = pushMock.mock.calls[0][0] as string;
    expect(arg).toMatch(/^\/audit\?/);
    expect(arg).toContain("event_type=plan.updated");
    expect(arg).toContain("actor=ana");
  });

  it("clear button pushes /audit (no params)", async () => {
    const user = userEvent.setup();
    render(<AuditFilters apps={apps} initial={{ event_type: "plan.updated" }} />);

    await user.click(screen.getByRole("button", { name: /limpar/i }));
    expect(pushMock).toHaveBeenCalledWith("/audit");
  });

  it("preset 7d sets from to ISO 7 days ago and re-submits", async () => {
    const user = userEvent.setup();
    render(<AuditFilters apps={apps} initial={{}} />);

    await user.click(screen.getByRole("button", { name: /^7 dias$/i }));

    expect(pushMock).toHaveBeenCalled();
    const arg = pushMock.mock.calls[0][0] as string;
    expect(arg).toMatch(/from=/);
  });

  it("preset hoje sets from=startOfDay and re-submits", async () => {
    const user = userEvent.setup();
    render(<AuditFilters apps={apps} initial={{}} />);

    await user.click(screen.getByRole("button", { name: /^hoje$/i }));

    const arg = pushMock.mock.calls[0][0] as string;
    expect(arg).toMatch(/from=/);
  });

  it("apply button is disabled when from > to", async () => {
    const user = userEvent.setup();
    render(<AuditFilters apps={apps} initial={{}} />);

    await user.click(screen.getByRole("button", { name: /custom/i }));

    const fromInput = screen.getByLabelText(/de/i) as HTMLInputElement;
    const toInput = screen.getByLabelText(/até/i) as HTMLInputElement;

    await user.type(fromInput, "2026-04-30T10:00");
    await user.type(toInput, "2026-04-01T10:00");

    const apply = screen.getByRole("button", { name: /aplicar/i }) as HTMLButtonElement;
    expect(apply.disabled).toBe(true);
  });
});
