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
    // email aparece uma única vez (como principal, sem linha secundária duplicada)
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
    expect(screen.getByText("Clínica B")).toBeInTheDocument();
    expect(screen.getByText("Loja C")).toBeInTheDocument();
    expect(screen.queryByText("Studio D")).not.toBeInTheDocument();
    expect(screen.getByText("+2")).toBeInTheDocument();
  });

  it("mostra (sem org) quando o usuário não tem orgs", () => {
    render(<UserListTable rows={[row({ orgs: [] })]} />);
    expect(screen.getByText("(sem org)")).toBeInTheDocument();
  });
});
