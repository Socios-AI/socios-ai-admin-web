"use client";

import { useState } from "react";
import { lookupCnpjAction } from "@/app/_actions/lookup-cnpj";
import { lookupCepAction } from "@/app/_actions/lookup-cep";
import { PhoneField } from "./PhoneField";

export type ProfileValue = {
  country: "BR" | "US";
  person_type: "individual" | "company";
  tax_id: string;
  company_legal_name: string;
  company_trade_name: string;
  company_entity_type: string;
  legal_rep_name: string;
  legal_rep_tax_id: string;
  signatory_title: string;
  phone: string;
  birth_date: string;
  address_postal_code: string;
  address_line1: string;
  address_number: string;
  address_complement: string;
  address_district: string;
  address_city: string;
  address_state: string;
  cnpj_status: string;
  // payout
  payout_method: "" | "pix" | "bank_br" | "bank_us" | "zelle";
  pix_key: string;
  pix_key_type: string;
  bank_name: string;
  branch: string;
  account_number: string;
  account_digit: string;
  account_type: string;
  routing_number: string;
  zelle_identifier: string;
  zelle_type: string;
};

export const emptyProfileValue: ProfileValue = {
  country: "BR", person_type: "individual", tax_id: "",
  company_legal_name: "", company_trade_name: "", company_entity_type: "",
  legal_rep_name: "", legal_rep_tax_id: "", signatory_title: "", phone: "", birth_date: "",
  address_postal_code: "", address_line1: "", address_number: "",
  address_complement: "", address_district: "", address_city: "",
  address_state: "", cnpj_status: "",
  payout_method: "", pix_key: "", pix_key_type: "", bank_name: "", branch: "",
  account_number: "", account_digit: "", account_type: "", routing_number: "",
  zelle_identifier: "", zelle_type: "",
};

const input = "w-full rounded-lg border border-input bg-background px-3 py-2 text-sm";
const label = "block text-sm font-medium mb-1";

export function PartnerProfileFields({
  value,
  onChange,
  requireContractFields = false,
}: {
  value: ProfileValue;
  onChange: (patch: Partial<ProfileValue>) => void;
  // Trava F3: no convite de licenciado, os campos obrigatórios do contrato
  // (documento, endereço, representante legal PJ) ganham required + asterisco.
  requireContractFields?: boolean;
}) {
  const [notice, setNotice] = useState<string | null>(null);
  const isBR = value.country === "BR";
  const isPJ = value.person_type === "company";
  const req = requireContractFields;
  const mark = (labelText: string, required: boolean) => (required ? `${labelText} *` : labelText);

  // Helper de renderização (NÃO é um componente): retorna JSX cru de <input> pra
  // evitar remount/perda de foco a cada tecla. Chamar como {renderField(...)}.
  const renderField = (name: keyof ProfileValue, labelText: string, type = "text", required = false) => (
    <div>
      <label htmlFor={name} className={label}>{mark(labelText, required)}</label>
      <input
        id={name}
        type={type}
        value={value[name] as string}
        onChange={(e) => onChange({ [name]: e.target.value } as Partial<ProfileValue>)}
        className={input}
        required={required}
      />
    </div>
  );

  async function onCnpjBlur() {
    if (!isBR || !isPJ || !value.tax_id) return;
    const r = await lookupCnpjAction(value.tax_id);
    if (r.ok) {
      onChange({
        company_legal_name: r.data.company_legal_name ?? value.company_legal_name,
        company_trade_name: r.data.company_trade_name ?? value.company_trade_name,
        cnpj_status: r.data.cnpj_status ?? "",
        address_postal_code: r.data.address_postal_code ?? value.address_postal_code,
        address_line1: r.data.address_line1 ?? value.address_line1,
        address_number: r.data.address_number ?? value.address_number,
        address_complement: r.data.address_complement ?? value.address_complement,
        address_district: r.data.address_district ?? value.address_district,
        address_city: r.data.address_city ?? value.address_city,
        address_state: r.data.address_state ?? value.address_state,
      });
      setNotice(r.warning ?? "CNPJ verificado na Receita.");
    } else {
      setNotice(`Não validou o CNPJ: ${r.error}. Você pode preencher manualmente.`);
    }
  }

  async function onCepBlur() {
    if (!isBR || !value.address_postal_code) return;
    const r = await lookupCepAction(value.address_postal_code);
    if (r.ok) {
      onChange({
        address_line1: r.data.address_line1 ?? value.address_line1,
        address_district: r.data.address_district ?? value.address_district,
        address_city: r.data.address_city ?? value.address_city,
        address_state: r.data.address_state ?? value.address_state,
      });
    }
  }

  return (
    <div className="space-y-5 border-t border-border pt-5">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Cadastro completo</h3>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="country" className={label}>País / mercado</label>
          <select id="country" value={value.country} onChange={(e) => onChange({ country: e.target.value as ProfileValue["country"] })} className={input}>
            <option value="BR">Brasil</option>
            <option value="US">Estados Unidos</option>
          </select>
        </div>
        <div>
          <label htmlFor="person_type" className={label}>Tipo de pessoa</label>
          <select id="person_type" value={value.person_type} onChange={(e) => onChange({ person_type: e.target.value as ProfileValue["person_type"] })} className={input}>
            <option value="individual">Pessoa física</option>
            <option value="company">Pessoa jurídica</option>
          </select>
        </div>
      </div>

      {/* Fiscal */}
      <div className="grid grid-cols-2 gap-4">
        {!isPJ && isBR && (
          <div>
            <label htmlFor="tax_id" className={label}>{mark("CPF", req)}</label>
            <input id="tax_id" value={value.tax_id} onChange={(e) => onChange({ tax_id: e.target.value })} className={input} required={req} />
          </div>
        )}
        {!isPJ && !isBR && (
          <div>
            <label htmlFor="tax_id" className={label}>{mark("SSN / ITIN", req)}</label>
            <input id="tax_id" value={value.tax_id} onChange={(e) => onChange({ tax_id: e.target.value })} className={input} required={req} />
          </div>
        )}
        {isPJ && isBR && (
          <div>
            <label htmlFor="tax_id" className={label}>{mark("CNPJ", req)}</label>
            <input id="tax_id" value={value.tax_id} onBlur={onCnpjBlur} onChange={(e) => onChange({ tax_id: e.target.value })} className={input} required={req} />
          </div>
        )}
        {isPJ && !isBR && (
          <div>
            <label htmlFor="tax_id" className={label}>{mark("EIN", req)}</label>
            <input id="tax_id" value={value.tax_id} onChange={(e) => onChange({ tax_id: e.target.value })} className={input} placeholder="XX-XXXXXXX" required={req} />
          </div>
        )}
        {!isPJ && renderField("birth_date", "Data de nascimento", "date")}
      </div>

      {isPJ && (
        <div className="grid grid-cols-2 gap-4">
          {renderField("company_legal_name", isBR ? "Razão social" : "Legal entity name", "text", req)}
          {renderField("company_trade_name", isBR ? "Nome fantasia" : "DBA / trade name")}
          {!isBR && renderField("company_entity_type", "Entity type (LLC, C-Corp...)")}
          {renderField("legal_rep_name", isBR ? "Responsável legal" : "Legal representative", "text", req)}
          {isBR && renderField("legal_rep_tax_id", "CPF do responsável")}
          {renderField("signatory_title", "Cargo de quem assina (ex.: Sócio Administrador)")}
        </div>
      )}

      <PhoneField
        valueE164={value.phone}
        defaultCountry={value.country}
        onChange={(e164) => onChange({ phone: e164 })}
      />
      {value.cnpj_status && (
        <p className="text-xs text-muted-foreground">Situação cadastral (Receita): {value.cnpj_status}</p>
      )}

      {/* Endereço */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="address_postal_code" className={label}>{mark(isBR ? "CEP" : "ZIP", req)}</label>
          <input id="address_postal_code" value={value.address_postal_code} onBlur={onCepBlur} onChange={(e) => onChange({ address_postal_code: e.target.value })} className={input} required={req} />
        </div>
        {renderField("address_line1", isBR ? "Logradouro" : "Street address", "text", req)}
        {isBR && renderField("address_number", "Número")}
        {renderField("address_complement", isBR ? "Complemento" : "Apt / Suite")}
        {isBR && renderField("address_district", "Bairro")}
        {renderField("address_city", isBR ? "Cidade" : "City", "text", req)}
        {renderField("address_state", isBR ? "UF" : "State", "text", req)}
      </div>

      {/* Payout */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="payout_method" className={label}>Método de payout</label>
          <select id="payout_method" value={value.payout_method} onChange={(e) => onChange({ payout_method: e.target.value as ProfileValue["payout_method"] })} className={input}>
            <option value="">(nenhum)</option>
            {isBR && <option value="pix">PIX</option>}
            {isBR && <option value="bank_br">Conta bancária (BR)</option>}
            {!isBR && <option value="bank_us">Bank account (US)</option>}
            {!isBR && <option value="zelle">Zelle</option>}
          </select>
        </div>
      </div>
      {value.payout_method === "pix" && (
        <div className="grid grid-cols-2 gap-4">
          {renderField("pix_key", "Chave PIX")}
          <div>
            <label htmlFor="pix_key_type" className={label}>Tipo da chave</label>
            <select id="pix_key_type" value={value.pix_key_type} onChange={(e) => onChange({ pix_key_type: e.target.value })} className={input}>
              <option value="">(selecione)</option>
              <option value="cpf">CPF</option><option value="cnpj">CNPJ</option>
              <option value="email">Email</option><option value="phone">Telefone</option>
              <option value="random">Aleatória</option>
            </select>
          </div>
        </div>
      )}
      {value.payout_method === "bank_br" && (
        <div className="grid grid-cols-2 gap-4">
          {renderField("bank_name", "Banco")}
          {renderField("branch", "Agência")}
          {renderField("account_number", "Conta")}
          {renderField("account_digit", "Dígito")}
          <div>
            <label htmlFor="account_type" className={label}>Tipo de conta</label>
            <select id="account_type" value={value.account_type} onChange={(e) => onChange({ account_type: e.target.value })} className={input}>
              <option value="">(selecione)</option>
              <option value="checking">Corrente</option><option value="savings">Poupança</option>
            </select>
          </div>
        </div>
      )}
      {value.payout_method === "bank_us" && (
        <div className="grid grid-cols-2 gap-4">
          {renderField("bank_name", "Bank name")}
          {renderField("routing_number", "Routing number (ABA)")}
          {renderField("account_number", "Account number")}
          <div>
            <label htmlFor="account_type" className={label}>Account type</label>
            <select id="account_type" value={value.account_type} onChange={(e) => onChange({ account_type: e.target.value })} className={input}>
              <option value="">(select)</option>
              <option value="checking">Checking</option><option value="savings">Savings</option>
            </select>
          </div>
        </div>
      )}
      {value.payout_method === "zelle" && (
        <div className="grid grid-cols-2 gap-4">
          {renderField("zelle_identifier", "Zelle (email ou telefone)")}
          <div>
            <label htmlFor="zelle_type" className={label}>Tipo</label>
            <select id="zelle_type" value={value.zelle_type} onChange={(e) => onChange({ zelle_type: e.target.value })} className={input}>
              <option value="">(select)</option>
              <option value="email">Email</option><option value="phone">Phone</option>
            </select>
          </div>
        </div>
      )}

      {notice && (
        <p className="rounded-md border border-warning/50 bg-warning/15 px-3 py-2 text-sm text-foreground">
          {notice}
        </p>
      )}
    </div>
  );
}

// Converte ProfileValue para payload do RPC partner_profile_upsert (sem campos vazios).
export function toProfilePayload(v: ProfileValue): Record<string, unknown> {
  const p: Record<string, unknown> = {
    country: v.country, person_type: v.person_type,
  };
  const put = (k: string, val: string) => { if (val && val.trim()) p[k] = val.trim(); };
  put("tax_id", v.tax_id);
  put("company_legal_name", v.company_legal_name);
  put("company_trade_name", v.company_trade_name);
  put("company_entity_type", v.company_entity_type);
  put("legal_rep_name", v.legal_rep_name);
  put("legal_rep_tax_id", v.legal_rep_tax_id);
  put("signatory_title", v.signatory_title);
  put("phone", v.phone);
  put("birth_date", v.birth_date);
  put("address_postal_code", v.address_postal_code);
  put("address_line1", v.address_line1);
  put("address_number", v.address_number);
  put("address_complement", v.address_complement);
  put("address_district", v.address_district);
  put("address_city", v.address_city);
  put("address_state", v.address_state);
  put("cnpj_status", v.cnpj_status);
  return p;
}

// Converte ProfileValue para payload de payout (ou null se nenhum método).
export function toPayoutPayload(v: ProfileValue): Record<string, unknown> | null {
  if (!v.payout_method) return null;
  const p: Record<string, unknown> = { method: v.payout_method };
  const put = (k: string, val: string) => { if (val && val.trim()) p[k] = val.trim(); };
  put("pix_key", v.pix_key); put("pix_key_type", v.pix_key_type);
  put("bank_name", v.bank_name); put("branch", v.branch);
  put("account_number", v.account_number); put("account_digit", v.account_digit);
  put("account_type", v.account_type); put("routing_number", v.routing_number);
  put("zelle_identifier", v.zelle_identifier); put("zelle_type", v.zelle_type);
  return p;
}
