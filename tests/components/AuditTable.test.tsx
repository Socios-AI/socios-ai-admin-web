import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { AuditTable } from "../../components/AuditTable";
import type { AuditLogEntry } from "../../lib/data";

function makeRow(over: Partial<AuditLogEntry> = {}): AuditLogEntry {
  return {
    id: 1,
    event_type: "plan.updated",
    actor_user_id: "actor-uuid-aaaaaaaa-aaaa-aaaa-aaaaaaaaaaaa",
    target_user_id: null,
    app_slug: "case-predictor",
    org_id: null,
    metadata: { plan_id: "plan-1" },
    ip_address: "192.168.1.1",
    user_agent: "test",
    created_at: "2026-04-26T10:30:00.000Z",
    ...over,
  };
}

describe("AuditTable", () => {
  it("renders 'sem eventos registrado' when rows is empty and no filters applied", () => {
    render(<AuditTable rows={[]} profileMap={new Map()} />);
    expect(screen.getByText(/nenhum evento registrado/i)).toBeTruthy();
  });

  it("renders 'nenhum evento encontrado' + limpar filtros link when filtersApplied", () => {
    render(<AuditTable rows={[]} profileMap={new Map()} filtersApplied />);
    expect(screen.getByText(/nenhum evento encontrado/i)).toBeTruthy();
    const link = screen.getByRole("link", { name: /limpar filtros/i }) as HTMLAnchorElement;
    expect(link.getAttribute("href")).toBe("/audit");
  });

  it("renders email when actor is in profileMap", () => {
    const row = makeRow();
    const profileMap = new Map([[row.actor_user_id!, { email: "ana@x.com" }]]);
    render(<AuditTable rows={[row]} profileMap={profileMap} />);
    expect(screen.getByText("ana@x.com")).toBeTruthy();
  });

  it("renders truncated UUID when actor is NOT in profileMap", () => {
    const row = makeRow({ actor_user_id: "abcdef12-3456-7890-abcd-ef1234567890" });
    render(<AuditTable rows={[row]} profileMap={new Map()} />);
    expect(screen.getByText(/abcdef12…/)).toBeTruthy();
  });

  it("renders middle-dot for null actor/target", () => {
    const row = makeRow({ actor_user_id: null, target_user_id: null });
    render(<AuditTable rows={[row]} profileMap={new Map()} />);
    expect(screen.getAllByText("·").length).toBeGreaterThan(0);
  });

  it("renders event_type and app_slug as text", () => {
    const row = makeRow({ event_type: "membership.granted", app_slug: "lead-pro" });
    render(<AuditTable rows={[row]} profileMap={new Map()} />);
    expect(screen.getByText("membership.granted")).toBeTruthy();
    expect(screen.getByText("lead-pro")).toBeTruthy();
  });

  it("expand reveals JSON metadata", () => {
    const row = makeRow({ metadata: { plan_id: "p1", reason: "test" } });
    render(<AuditTable rows={[row]} profileMap={new Map()} />);
    const pre = screen.getByText(/"plan_id": "p1"/);
    expect(pre).toBeTruthy();
  });

  it("expand shows ip_address and user_agent when present", () => {
    const row = makeRow({ ip_address: "10.0.0.5", user_agent: "Mozilla/5.0" });
    render(<AuditTable rows={[row]} profileMap={new Map()} />);
    expect(screen.getByText("10.0.0.5")).toBeTruthy();
    expect(screen.getByText("Mozilla/5.0")).toBeTruthy();
  });

  it("does not render ip_address when null", () => {
    const row = makeRow({ ip_address: null });
    render(<AuditTable rows={[row]} profileMap={new Map()} />);
    expect(screen.queryByText(/IP:/)).toBeNull();
  });
});
