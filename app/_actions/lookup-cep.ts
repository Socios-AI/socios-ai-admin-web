"use server";

import { isValidCEP } from "@/lib/partner-validation";

export type CepLookup = {
  address_line1?: string;
  address_district?: string;
  address_city?: string;
  address_state?: string;
};

export type LookupResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

export async function lookupCepAction(cep: string): Promise<LookupResult<CepLookup>> {
  if (!isValidCEP(cep)) return { ok: false, error: "CEP inválido" };
  const clean = cep.replace(/\D/g, "");
  try {
    const res = await fetch(`https://viacep.com.br/ws/${clean}/json/`, {
      signal: AbortSignal.timeout(5000),
      headers: { accept: "application/json" },
    });
    if (!res.ok) return { ok: false, error: `ViaCEP status ${res.status}` };
    const j = (await res.json()) as Record<string, unknown>;
    if (j.erro) return { ok: false, error: "CEP não encontrado" };
    return {
      ok: true,
      data: {
        address_line1: (j.logradouro as string) || undefined,
        address_district: (j.bairro as string) || undefined,
        address_city: (j.localidade as string) || undefined,
        address_state: (j.uf as string) || undefined,
      },
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "lookup falhou" };
  }
}
