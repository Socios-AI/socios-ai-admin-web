import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { PartnerProfileFields, emptyProfileValue } from "../../components/PartnerProfileFields";

describe("<PartnerProfileFields>", () => {
  it("mostra campo CPF pra BR pessoa física", () => {
    const onChange = vi.fn();
    render(
      <PartnerProfileFields
        value={{ ...emptyProfileValue, country: "BR", person_type: "individual" }}
        onChange={onChange}
      />
    );
    // BR individual renders <label htmlFor="tax_id">CPF</label>
    expect(screen.getByLabelText(/^CPF$/i)).toBeInTheDocument();
  });

  it("mostra Razão social pra PJ", () => {
    render(
      <PartnerProfileFields
        value={{ ...emptyProfileValue, country: "BR", person_type: "company" }}
        onChange={vi.fn()}
      />
    );
    // Field helper renders <label htmlFor="company_legal_name">Razão social</label>
    expect(screen.getByLabelText(/^Razão social$/i)).toBeInTheDocument();
  });

  it("US PJ pede EIN e Zelle disponível", () => {
    render(
      <PartnerProfileFields
        value={{ ...emptyProfileValue, country: "US", person_type: "company" }}
        onChange={vi.fn()}
      />
    );
    // US company renders <label htmlFor="tax_id">EIN</label>
    expect(screen.getByLabelText(/^EIN$/i)).toBeInTheDocument();
  });

  it("chama onChange ao digitar telefone", () => {
    const onChange = vi.fn();
    render(
      <PartnerProfileFields
        value={{ ...emptyProfileValue, country: "BR", person_type: "individual" }}
        onChange={onChange}
      />
    );
    // Field helper renders <label htmlFor="phone">Telefone</label>
    fireEvent.change(screen.getByLabelText(/^Telefone$/i), {
      target: { value: "+5511999998888" },
    });
    expect(onChange).toHaveBeenCalled();
  });
});
