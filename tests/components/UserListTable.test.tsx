import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { UserListTable } from "../../components/UserListTable";
import type { UserRow } from "../../lib/data";

function row(over: Partial<UserRow> = {}): UserRow {
  return {
    id: "u1",
    email: "person@example.com",
    full_name: "Maria Silva",
    created_at: "2026-06-29T12:00:00Z",
    is_super_admin: false,
    orgs: [],
    partner_role: null,
    partner_status: null,
    staff_tier: null,
    ...over,
  };
}

describe("<UserListTable>", () => {
  it("mostra nome em cima e email embaixo quando há full_name", () => {
    render(<UserListTable rows={[row({ full_name: "Maria Silva", email: "maria@x.com" })]} />);
    expect(screen.getByText("Maria Silva")).toBeInTheDocument();
    expect(screen.getByText("maria@x.com")).toBeInTheDocument();
  });

  it("usa o email como principal quando não há nome", () => {
    render(<UserListTable rows={[row({ full_name: null, email: "noname@x.com" })]} />);
    expect(screen.getAllByText("noname@x.com")).toHaveLength(1);
  });

  it("lista as orgs como chips e colapsa o excedente em +N", () => {
    const orgs = [
      { id: "o1", name: "Salão A" },
      { id: "o2", name: "Clínica B" },
      { id: "o3", name: "Loja C" },
      { id: "o4", name: "Studio D" },
      { id: "o5", name: "Espaço E" },
    ];
    render(<UserListTable rows={[row({ orgs })]} />);
    expect(screen.getByText("Salão A")).toBeInTheDocument();
    expect(screen.getByText("Loja C")).toBeInTheDocument();
    expect(screen.queryByText("Studio D")).not.toBeInTheDocument();
    expect(screen.getByText("+2")).toBeInTheDocument();
  });

  it("mostra o papel de parceiro (representante -> Revendedor) e a org junto", () => {
    render(
      <UserListTable
        rows={[row({ partner_role: "representante", partner_status: "active", orgs: [{ id: "o1", name: "Salão A" }] })]}
      />,
    );
    expect(screen.getByText("Revendedor")).toBeInTheDocument();
    expect(screen.getByText("Salão A")).toBeInTheDocument();
  });

  it("mostra o papel de licenciado mesmo sem org", () => {
    render(<UserListTable rows={[row({ partner_role: "licenciado", partner_status: "active", orgs: [] })]} />);
    expect(screen.getByText("Licenciado")).toBeInTheDocument();
    expect(screen.queryByText("(sem vínculo)")).not.toBeInTheDocument();
  });

  it("mostra badge de staff (registrar -> Cadastrador)", () => {
    render(<UserListTable rows={[row({ staff_tier: "registrar" })]} />);
    expect(screen.getByText("Cadastrador")).toBeInTheDocument();
  });

  it("mostra (sem vínculo) quando não há org, papel nem staff", () => {
    render(<UserListTable rows={[row({ orgs: [], partner_role: null, staff_tier: null })]} />);
    expect(screen.getByText("(sem vínculo)")).toBeInTheDocument();
  });
});
