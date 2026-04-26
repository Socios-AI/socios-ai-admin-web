import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { AuditPagination } from "../../components/AuditPagination";

describe("AuditPagination", () => {
  it("renders nothing when nextCursor is null", () => {
    const { container } = render(
      <AuditPagination currentParams={{}} nextCursor={null} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders link with after=<cursor> when nextCursor present", () => {
    render(
      <AuditPagination
        currentParams={{ event_type: "plan.updated" }}
        nextCursor="abc123"
      />,
    );
    const link = screen.getByRole("link", { name: /carregar mais/i }) as HTMLAnchorElement;
    expect(link.getAttribute("href")).toContain("after=abc123");
    expect(link.getAttribute("href")).toContain("event_type=plan.updated");
  });

  it("link href starts with /audit?", () => {
    render(<AuditPagination currentParams={{}} nextCursor="x" />);
    const link = screen.getByRole("link", { name: /carregar mais/i }) as HTMLAnchorElement;
    expect(link.getAttribute("href")!.startsWith("/audit?")).toBe(true);
  });
});
