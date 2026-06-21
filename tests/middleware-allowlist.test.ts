import { describe, it, expect } from "vitest";
import { isRegistrarAllowed } from "@/middleware";

describe("isRegistrarAllowed · allowlist do cadastrador (registrar)", () => {
  it("libera as rotas de cadastro de parceiro e tenant + leitura", () => {
    for (const p of [
      "/partners",
      "/partners/invite",
      "/partners/invite/whatever",
      "/orgs",
      "/orgs/new",
      "/tree",
    ]) {
      expect(isRegistrarAllowed(p)).toBe(true);
    }
  });

  it("bloqueia financeiro, config, detalhe e tudo o mais", () => {
    for (const p of [
      "/", // tratado por redirect na middleware, não pela allowlist
      "/commissions",
      "/products",
      "/attributions",
      "/apps",
      "/plans",
      "/users",
      "/users/123",
      "/affiliates",
      "/audit",
      "/partners/abc-123", // detalhe do parceiro (dados financeiros)
      "/orgs/abc-123", // detalhe da org
      "/partnersfoo", // não casa prefixo solto
    ]) {
      expect(isRegistrarAllowed(p)).toBe(false);
    }
  });
});
