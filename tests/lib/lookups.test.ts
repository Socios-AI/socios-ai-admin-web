import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { lookupCnpjAction } from "../../app/_actions/lookup-cnpj";
import { lookupCepAction } from "../../app/_actions/lookup-cep";

const okJson = (body: unknown) =>
  ({ ok: true, status: 200, json: async () => body }) as Response;

beforeEach(() => { vi.restoreAllMocks(); });
afterEach(() => { vi.restoreAllMocks(); });

describe("lookupCnpjAction", () => {
  it("mapeia BrasilAPI ATIVA", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => okJson({
      razao_social: "ACME LTDA", nome_fantasia: "ACME",
      descricao_situacao_cadastral: "ATIVA",
      cep: "01001-000", logradouro: "Praça da Sé", numero: "1",
      complemento: "", bairro: "Sé", municipio: "São Paulo", uf: "SP",
    })));
    const r = await lookupCnpjAction("11.222.333/0001-81");
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.company_legal_name).toBe("ACME LTDA");
      expect(r.data.cnpj_status).toBe("ATIVA");
      expect(r.data.address_city).toBe("São Paulo");
      expect(r.data.address_state).toBe("SP");
    }
  });
  it("CNPJ inválido não chama a API", async () => {
    const f = vi.fn();
    vi.stubGlobal("fetch", f);
    const r = await lookupCnpjAction("123");
    expect(r.ok).toBe(false);
    expect(f).not.toHaveBeenCalled();
  });
});

describe("lookupCepAction", () => {
  it("mapeia ViaCEP", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => okJson({
      logradouro: "Praça da Sé", bairro: "Sé", localidade: "São Paulo", uf: "SP",
    })));
    const r = await lookupCepAction("01001-000");
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.address_line1).toBe("Praça da Sé");
      expect(r.data.address_city).toBe("São Paulo");
    }
  });
  it("ViaCEP erro:true → not found", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => okJson({ erro: true })));
    const r = await lookupCepAction("00000-000");
    expect(r.ok).toBe(false);
  });
});
