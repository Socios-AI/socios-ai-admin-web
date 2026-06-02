import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { PhoneField } from "../../components/PhoneField";

describe("<PhoneField>", () => {
  it("emite E.164 ao digitar número nacional BR", () => {
    const onChange = vi.fn();
    render(<PhoneField valueE164="" defaultCountry="BR" onChange={onChange} />);
    fireEvent.change(screen.getByLabelText("Telefone"), { target: { value: "62 3292 5602" } });
    expect(onChange).toHaveBeenLastCalledWith("+556232925602");
  });

  it("emite E.164 US quando país é US", () => {
    const onChange = vi.fn();
    render(<PhoneField valueE164="" defaultCountry="US" onChange={onChange} />);
    fireEvent.change(screen.getByLabelText("Telefone"), { target: { value: "213 373 4253" } });
    expect(onChange).toHaveBeenLastCalledWith("+12133734253");
  });

  it("emite string vazia quando o número é impossível pro país", () => {
    const onChange = vi.fn();
    render(<PhoneField valueE164="" defaultCountry="BR" onChange={onChange} />);
    fireEvent.change(screen.getByLabelText("Telefone"), { target: { value: "123" } });
    expect(onChange).toHaveBeenLastCalledWith("");
  });

  it("parseia E.164 existente em país + número nacional", () => {
    render(<PhoneField valueE164="+556232925602" onChange={vi.fn()} />);
    expect((screen.getByLabelText("País do telefone") as HTMLSelectElement).value).toBe("BR");
    expect((screen.getByLabelText("Telefone") as HTMLInputElement).value).toContain("3292");
  });

  it("re-emite ao trocar o país", () => {
    const onChange = vi.fn();
    render(<PhoneField valueE164="" defaultCountry="BR" onChange={onChange} />);
    fireEvent.change(screen.getByLabelText("Telefone"), { target: { value: "213 373 4253" } });
    fireEvent.change(screen.getByLabelText("País do telefone"), { target: { value: "US" } });
    expect(onChange).toHaveBeenLastCalledWith("+12133734253");
  });
});
