"use server";

import { isValidCNPJ } from "@/lib/partner-validation";

export type CnpjLookup = {
  company_legal_name?: string;
  company_trade_name?: string;
  cnpj_status?: string;
  address_postal_code?: string;
  address_line1?: string;
  address_number?: string;
  address_complement?: string;
  address_district?: string;
  address_city?: string;
  address_state?: string;
  cnpj_raw?: unknown;
};

export type LookupResult<T> =
  | { ok: true; data: T; warning?: string }
  | { ok: false; error: string };

export async function lookupCnpjAction(cnpj: string): Promise<LookupResult<CnpjLookup>> {
  if (!isValidCNPJ(cnpj)) return { ok: false, error: "CNPJ inválido" };
  const clean = cnpj.replace(/\D/g, "");
  try {
    const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${clean}`, {
      signal: AbortSignal.timeout(5000),
      headers: { accept: "application/json", "user-agent": "SociosAI/1.0 (+https://sociosai.com)" },
    });
    if (!res.ok) return { ok: false, error: `BrasilAPI status ${res.status}` };
    const j = (await res.json()) as Record<string, unknown>;
    const status = String(j.descricao_situacao_cadastral ?? "");
    const data: CnpjLookup = {
      company_legal_name: (j.razao_social as string) || undefined,
      company_trade_name: (j.nome_fantasia as string) || undefined,
      cnpj_status: status || undefined,
      address_postal_code: (j.cep as string) || undefined,
      address_line1: (j.logradouro as string) || undefined,
      address_number: (j.numero as string) || undefined,
      address_complement: (j.complemento as string) || undefined,
      address_district: (j.bairro as string) || undefined,
      address_city: (j.municipio as string) || undefined,
      address_state: (j.uf as string) || undefined,
      cnpj_raw: j,
    };
    const warning = status && status !== "ATIVA" ? `Situação cadastral: ${status}` : undefined;
    return { ok: true, data, warning };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "lookup falhou" };
  }
}
