// Formato alinhado a /contrato .../schemas/contract_payload.schema.json (subset v1).
export type ContractCountry = "BR" | "US";

export type CounterpartyInput = {
  display_name: string;
  email: string;
  person_type: "individual" | "company";
  country: ContractCountry;
  tax_id?: string;
  tax_id_type?: "cpf" | "cnpj" | "ssn" | "itin" | "ein";
  company_legal_name?: string;
  company_trade_name?: string;
  legal_rep_name?: string;
  legal_rep_tax_id?: string;
  phone?: string;
  address_postal_code?: string;
  address_line1?: string;
  address_number?: string;
  address_complement?: string;
  address_district?: string;
  address_city?: string;
  address_state?: string;
};

export type BuildContractInput = {
  invitationId: string;
  counterparty: CounterpartyInput;
  licenseAmountUsd: number;
  territory: string;
  commission: {
    negotiatedPct: number | null; // fração 0..1; default 0.5 se null
    recruitBonusPct: number; // 0.5
    residualOverridePct: number; // 0.07
  };
};

export type ContractPayload = {
  agreement: {
    template_id: string;
    version: string;
    controlling_language: string;
    reference_language: string | null;
    governing_law: string;
    arbitration_seat: string;
    arbitration_rules: string;
  };
  socios: {
    legal_name: string;
    entity_type: string;
    ein: string;
    registered_address: string;
    authorized_representative: string;
  };
  counterparty: {
    display_name: string;
    email: string;
    is_legal_entity: boolean;
    legal_name: string | null;
    trade_name: string | null;
    primary_tax_id_label: string | null;
    primary_tax_id_value: string | null;
    legal_rep_name: string | null;
    legal_rep_tax_id: string | null;
    phone: string | null;
    address_full: string;
  };
  commercial: {
    territory: string;
    territory_exclusivity: "non-exclusive";
    products: string;
    fees: { currency: string; licensing_fee_amount: number };
    commission: {
      net_profit_percentage: number;
      licensing_fee_percentage: number;
      residual_percentage: number;
      calculation_basis: string;
    };
  };
};

export type BuildResult =
  | { ok: true; payload: ContractPayload; payloadHash: string; country: ContractCountry; addenda: string[] }
  | { ok: false; reason: "UNSUPPORTED_COUNTRY" | "EXCLUSIVE_TERRITORY" | "MISSING_FIELD"; message: string };
