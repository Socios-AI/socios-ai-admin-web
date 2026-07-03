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
  it("prefills the responsible name/email from props (Dar acesso a outro app)", () => {
    render(
      <CreateOrgForm
        apps={apps}
        initialAdminName="Antonio Sanches"
        initialAdminEmail="pepoclv+master@hotmail.com"
      />,
    );
    expect((screen.getByLabelText(/nome do responsável/i) as HTMLInputElement).value).toBe(
      "Antonio Sanches",
    );
    expect((screen.getByLabelText(/email do responsável/i) as HTMLInputElement).value).toBe(
      "pepoclv+master@hotmail.com",
    );
  });

  it("starts empty when no prefill is given", () => {
    render(<CreateOrgForm apps={apps} />);
    expect((screen.getByLabelText(/email do responsável/i) as HTMLInputElement).value).toBe("");
  });
});
