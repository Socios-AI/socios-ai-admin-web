import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("../../app/_actions/create-org-with-introducer", () => ({
  createOrgWithIntroducerAction: vi.fn(),
}));
vi.mock("../../app/_actions/search-partners", () => ({ searchPartnersAction: vi.fn() }));

import { CreateOrgForm } from "../../components/CreateOrgForm";

const apps = [
  { slug: "beauty", name: "Beauty", nicheCatalog: { salao_beleza: "Salão de Beleza" } },
  { slug: "scrapleads", name: "Leads Pró", nicheCatalog: null },
];

describe("CreateOrgForm prefill", () => {
  it("prefills client + responsible and locks identity fields (Dar acesso a outro app)", () => {
    render(
      <CreateOrgForm
        apps={apps}
        initialClientName="Antonio Sanches - TESTE"
        initialAdminName="Antonio Sanches"
        initialAdminEmail="pepoclv+master@hotmail.com"
      />,
    );
    const client = screen.getByLabelText(/nome do cliente/i) as HTMLInputElement;
    const name = screen.getByLabelText(/nome do responsável/i) as HTMLInputElement;
    const email = screen.getByLabelText(/email do responsável/i) as HTMLInputElement;

    expect(client.value).toBe("Antonio Sanches - TESTE");
    expect(name.value).toBe("Antonio Sanches");
    expect(email.value).toBe("pepoclv+master@hotmail.com");

    // Cliente existente → identidade travada (read-only).
    expect(client.readOnly).toBe(true);
    expect(name.readOnly).toBe(true);
    expect(email.readOnly).toBe(true);

    expect(screen.getByText(/cliente existente/i)).toBeTruthy();
  });

  it("keeps a non-prefilled field editable even in add-to-existing mode (no dead-end)", () => {
    // Link antigo: email preenchido, mas SEM clientName → o campo cliente não
    // pode ficar vazio e travado.
    render(
      <CreateOrgForm
        apps={apps}
        initialAdminName="Antonio Sanches"
        initialAdminEmail="pepoclv+master@hotmail.com"
      />,
    );
    const client = screen.getByLabelText(/nome do cliente/i) as HTMLInputElement;
    expect(client.value).toBe("");
    expect(client.readOnly).toBe(false); // editável, sem beco
    // os que vieram preenchidos seguem travados
    expect((screen.getByLabelText(/email do responsável/i) as HTMLInputElement).readOnly).toBe(true);
  });

  it("starts empty and editable when no prefill is given", () => {
    render(<CreateOrgForm apps={apps} />);
    const client = screen.getByLabelText(/nome do cliente/i) as HTMLInputElement;
    const email = screen.getByLabelText(/email do responsável/i) as HTMLInputElement;
    expect(client.value).toBe("");
    expect(email.value).toBe("");
    expect(client.readOnly).toBe(false);
    expect(email.readOnly).toBe(false);
    expect(screen.queryByText(/cliente existente/i)).toBeNull();
  });
});
