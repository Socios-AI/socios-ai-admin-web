import type { ContractCountry } from "./types";

// Derivado de /contrato .../routing/contract_routing_matrix.json (regional_routes).
export function resolveRouting(country: ContractCountry): {
  addenda: string[];
  controllingLanguage: string;
  referenceLanguage: string | null;
} {
  if (country === "BR") {
    return {
      addenda: ["BRAZIL_ADDENDUM_EN_PTBR", "LGPD_DPA", "BR_E_SIGNATURE"],
      controllingLanguage: "en-US",
      referenceLanguage: "pt-BR",
    };
  }
  // US
  return {
    addenda: ["US_ADDENDUM", "US_ESIGN_UETA", "US_TAX"],
    controllingLanguage: "en-US",
    referenceLanguage: null,
  };
}
