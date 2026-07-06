import { createHash } from "node:crypto";
import type { BuildContractInput, BuildResult, ContractCountry, ContractPayload } from "./types";
import { resolveRouting } from "./routing";

const SOCIOS_DEFAULTS = {
  legal_name: "SOCIOS A.I USA LLC",
  entity_type: "Florida Limited Liability Company",
  ein: "42-2315188",
  registered_address: "7550 Futures Drive, Suite 204, Orlando, FL 32819, United States of America",
  authorized_representative: "KAZAKS FORMULA FOR SUCCESS LLC",
};

const TEMPLATE_ID = "GLOBAL_MASTER_PARTNER_BR_BILINGUAL";
export const TEMPLATE_VERSION = "2026.07-final-review-v1";

function taxIdLabel(country: ContractCountry, personType: "individual" | "company"): string {
  if (country === "BR") return personType === "company" ? "CNPJ" : "CPF";
  return personType === "company" ? "EIN" : "SSN/ITIN";
}

function joinAddress(c: BuildContractInput["counterparty"]): string {
  return [c.address_line1, c.address_number, c.address_complement, c.address_district, c.address_city, c.address_state, c.address_postal_code]
    .filter((p) => p && p.trim() !== "")
    .join(", ");
}

// Canonicaliza (chaves ordenadas recursivamente) para um hash determinístico
// independente da ordem de inserção das chaves.
function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") {
    const sorted: Record<string, unknown> = {};
    for (const k of Object.keys(value as Record<string, unknown>).sort()) {
      sorted[k] = canonicalize((value as Record<string, unknown>)[k]);
    }
    return sorted;
  }
  return value;
}

function canonicalHash(payload: ContractPayload): string {
  return createHash("sha256").update(JSON.stringify(canonicalize(payload))).digest("hex");
}

export function buildContractPayload(input: BuildContractInput): BuildResult {
  const c = input.counterparty;

  if (c.country !== "BR" && c.country !== "US") {
    return { ok: false, reason: "UNSUPPORTED_COUNTRY", message: `País sem rota aprovada: ${c.country}. Revisão manual.` };
  }
  const territoryNorm = input.territory.toLowerCase().replace(/non[\s-]*exclusiv\w*/g, "");
  if (/exclusiv/.test(territoryNorm)) {
    return { ok: false, reason: "EXCLUSIVE_TERRITORY", message: "Território exclusivo exige revisão jurídica manual." };
  }
  const isCompany = c.person_type === "company";
  if (isCompany && !c.company_legal_name) {
    return { ok: false, reason: "MISSING_FIELD", message: "Razão social obrigatória para PJ." };
  }
  if (!c.display_name || !c.email) {
    return { ok: false, reason: "MISSING_FIELD", message: "Nome e e-mail obrigatórios." };
  }

  const routing = resolveRouting(c.country);
  const negotiated = input.commission.negotiatedPct ?? 0.5;

  const payload: ContractPayload = {
    agreement: {
      template_id: TEMPLATE_ID,
      version: TEMPLATE_VERSION,
      controlling_language: routing.controllingLanguage,
      reference_language: routing.referenceLanguage,
      governing_law: "Florida, United States",
      arbitration_seat: "Miami, Florida, United States",
      arbitration_rules: "ICDR International Arbitration Rules",
    },
    socios: { ...SOCIOS_DEFAULTS },
    counterparty: {
      display_name: c.display_name,
      email: c.email,
      is_legal_entity: isCompany,
      legal_name: c.company_legal_name ?? null,
      trade_name: c.company_trade_name ?? null,
      primary_tax_id_label: c.tax_id ? taxIdLabel(c.country, c.person_type) : null,
      primary_tax_id_value: c.tax_id ?? null,
      legal_rep_name: c.legal_rep_name ?? null,
      legal_rep_tax_id: c.legal_rep_tax_id ?? null,
      phone: c.phone ?? null,
      address_full: joinAddress(c),
    },
    commercial: {
      territory: input.territory,
      territory_exclusivity: "non-exclusive",
      products: "Todos os produtos autorizados do ecossistema Sócios AI.",
      fees: { currency: "USD", licensing_fee_amount: input.licenseAmountUsd },
      commission: {
        net_profit_percentage: negotiated,
        licensing_fee_percentage: input.commission.recruitBonusPct,
        residual_percentage: input.commission.residualOverridePct,
        calculation_basis:
          "Líquido = bruto menos taxas Stripe, impostos e custos de operação (percentuais configuráveis). Comissão = líquido x percentual do parceiro.",
      },
    },
  };

  return {
    ok: true,
    payload,
    payloadHash: canonicalHash(payload),
    country: c.country,
    addenda: routing.addenda,
  };
}
