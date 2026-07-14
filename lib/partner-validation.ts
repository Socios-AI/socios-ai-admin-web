import { z } from "zod";

const digits = (s: string) => (s ?? "").replace(/\D/g, "");

export function isValidCPF(input: string): boolean {
  const d = digits(input);
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false;
  const calc = (len: number) => {
    let sum = 0;
    for (let i = 0; i < len; i++) sum += Number(d[i]) * (len + 1 - i);
    const r = (sum * 10) % 11;
    return r === 10 ? 0 : r;
  };
  return calc(9) === Number(d[9]) && calc(10) === Number(d[10]);
}

export function isValidCNPJ(input: string): boolean {
  const d = digits(input);
  if (d.length !== 14 || /^(\d)\1{13}$/.test(d)) return false;
  const calc = (weights: number[]) => {
    const sum = weights.reduce((acc, w, i) => acc + Number(d[i]) * w, 0);
    const r = sum % 11;
    return r < 2 ? 0 : 11 - r;
  };
  const w1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const w2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  return calc(w1) === Number(d[12]) && calc(w2) === Number(d[13]);
}

export function isValidABA(input: string): boolean {
  const d = digits(input);
  if (d.length !== 9) return false;
  const s =
    3 * (Number(d[0]) + Number(d[3]) + Number(d[6])) +
    7 * (Number(d[1]) + Number(d[4]) + Number(d[7])) +
    1 * (Number(d[2]) + Number(d[5]) + Number(d[8]));
  return s > 0 && s % 10 === 0;
}

export function isValidEIN(input: string): boolean {
  return /^\d{2}-?\d{7}$/.test((input ?? "").trim());
}
export function isValidSSNorITIN(input: string): boolean {
  return /^\d{3}-?\d{2}-?\d{4}$/.test((input ?? "").trim());
}
export function isValidCEP(input: string): boolean {
  return /^\d{5}-?\d{3}$/.test((input ?? "").trim());
}
export function isValidZIP(input: string): boolean {
  return /^\d{5}(-?\d{4})?$/.test((input ?? "").trim());
}
export function isValidE164(input: string): boolean {
  return /^\+[1-9]\d{6,14}$/.test((input ?? "").trim());
}

const optStr = z.string().trim().min(1).optional().or(z.literal("").transform(() => undefined));

export const partnerProfileSchema = z
  .object({
    country: z.enum(["BR", "US"]),
    person_type: z.enum(["individual", "company"]),
    tax_id: z.string().trim().optional(),
    tax_id_type: z.enum(["cpf", "cnpj", "ssn", "itin", "ein"]).optional(),
    company_legal_name: optStr,
    company_trade_name: optStr,
    company_entity_type: optStr,
    legal_rep_name: optStr,
    legal_rep_tax_id: optStr,
    signatory_title: z.string().trim().optional(),
    phone: z.string().trim().optional(),
    birth_date: optStr,
    address_postal_code: z.string().trim().optional(),
    address_line1: optStr,
    address_number: optStr,
    address_complement: optStr,
    address_district: optStr,
    address_city: optStr,
    address_state: optStr,
    cnpj_status: optStr,
    cnpj_raw: z.unknown().optional(),
  })
  .superRefine((v, ctx) => {
    const add = (path: string, message: string) =>
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: [path], message });
    if (v.phone && !isValidE164(v.phone)) add("phone", "Telefone deve ser E.164 (+55...)");
    if (v.tax_id) {
      if (v.country === "BR" && v.person_type === "individual" && !isValidCPF(v.tax_id)) add("tax_id", "CPF inválido");
      if (v.country === "BR" && v.person_type === "company" && !isValidCNPJ(v.tax_id)) add("tax_id", "CNPJ inválido");
      if (v.country === "US" && v.person_type === "company" && !isValidEIN(v.tax_id)) add("tax_id", "EIN inválido (XX-XXXXXXX)");
      if (v.country === "US" && v.person_type === "individual" && !isValidSSNorITIN(v.tax_id)) add("tax_id", "SSN/ITIN inválido (XXX-XX-XXXX)");
    }
    if (v.address_postal_code) {
      if (v.country === "BR" && !isValidCEP(v.address_postal_code)) add("address_postal_code", "CEP inválido");
      if (v.country === "US" && !isValidZIP(v.address_postal_code)) add("address_postal_code", "ZIP inválido");
    }
    if (v.address_state && !/^[A-Za-z]{2}$/.test(v.address_state)) add("address_state", "UF/state deve ter 2 letras");
    if (v.person_type === "company" && !v.company_legal_name) add("company_legal_name", "Razão social obrigatória pra PJ");
  });

export const partnerPayoutSchema = z
  .object({
    method: z.enum(["pix", "bank_br", "bank_us", "zelle"]),
    pix_key: optStr,
    pix_key_type: z.enum(["cpf", "cnpj", "email", "phone", "random"]).optional(),
    bank_code: optStr,
    bank_name: optStr,
    branch: optStr,
    account_number: optStr,
    account_digit: optStr,
    account_type: z.enum(["checking", "savings"]).optional(),
    routing_number: optStr,
    zelle_identifier: optStr,
    zelle_type: z.enum(["email", "phone"]).optional(),
  })
  .superRefine((v, ctx) => {
    const add = (path: string, message: string) =>
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: [path], message });
    if (v.method === "pix" && !v.pix_key) add("pix_key", "Chave PIX obrigatória");
    if (v.method === "bank_us" && v.routing_number && !isValidABA(v.routing_number)) add("routing_number", "Routing (ABA) inválido");
    if (v.method === "zelle" && !v.zelle_identifier) add("zelle_identifier", "Identificador Zelle obrigatório");
  });

export type PartnerProfileInput = z.infer<typeof partnerProfileSchema>;
export type PartnerPayoutInput = z.infer<typeof partnerPayoutSchema>;

// Prefill gravado no convite (admin "preenche tudo"): perfil + métodos de payout.
// Defesa server-side: o caminho de convite grava prefill_profile como JSONB; este
// schema garante que phone E.164, documentos e payout passem antes de persistir.
export const prefillProfileSchema = z.intersection(
  partnerProfileSchema,
  z.object({ payout_methods: z.array(partnerPayoutSchema).optional() }),
);
