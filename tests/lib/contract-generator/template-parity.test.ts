import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it, expect } from "vitest";

// A tradução pt-BR precisa usar EXATAMENTE os mesmos placeholders/blocos
// Handlebars dos templates EN: mesma proteção contra campo vazio (F1) e
// mesma superfície de dados. Compara o multiset de tokens {{...}}.
const DIR = join(process.cwd(), "lib/contract-generator/templates");

const PAIRS: Array<[string, string]> = [
  ["master_partner_agreement_en.md", "locales/pt-BR/master_partner_agreement_ptBR.md"],
  ["commercial_terms_schedule_en.md", "locales/pt-BR/commercial_terms_schedule_ptBR.md"],
  ["brazil_addendum_en.md", "locales/pt-BR/brazil_addendum_ptBR.md"],
  ["global_dpa_base_en.md", "locales/pt-BR/global_dpa_base_ptBR.md"],
];

function tokens(file: string): string[] {
  const md = readFileSync(join(DIR, file), "utf-8");
  return (md.match(/\{\{[^}]+\}\}/g) ?? []).map((t) => t.replace(/\s+/g, " ")).sort();
}

describe("paridade de placeholders EN ↔ pt-BR", () => {
  for (const [en, pt] of PAIRS) {
    it(`${en} ↔ ${pt}`, () => {
      expect(tokens(pt)).toEqual(tokens(en));
    });
  }
});
