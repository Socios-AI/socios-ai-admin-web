"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  PartnerProfileFields,
  emptyProfileValue,
  toProfilePayload,
  toPayoutPayload,
  type ProfileValue,
} from "@/components/PartnerProfileFields";
import { updatePartnerRegistrationAction } from "@/app/_actions/update-partner-registration";

type RawProfile = Record<string, unknown> | null;

// Pré-preenche TODOS os campos existentes: o partner_profile_upsert sobrescreve
// com excluded.X (sem coalesce) na maioria, então campo não preenchido vira NULL.
// tax_id é mascarado (last4) → fica em branco e o coalesce do RPC o preserva.
function buildInitial(profile: RawProfile): ProfileValue {
  if (!profile) return emptyProfileValue;
  const s = (k: string) => (profile[k] as string) ?? "";
  return {
    ...emptyProfileValue,
    country: (profile.country as ProfileValue["country"]) ?? "BR",
    person_type: (profile.person_type as ProfileValue["person_type"]) ?? "individual",
    tax_id: "", // mascarado: re-digitar só se for trocar
    company_legal_name: s("company_legal_name"),
    company_trade_name: s("company_trade_name"),
    company_entity_type: s("company_entity_type"),
    legal_rep_name: s("legal_rep_name"),
    legal_rep_tax_id: "",
    phone: s("phone"),
    birth_date: s("birth_date"),
    address_postal_code: s("address_postal_code"),
    address_line1: s("address_line1"),
    address_number: s("address_number"),
    address_complement: s("address_complement"),
    address_district: s("address_district"),
    address_city: s("address_city"),
    address_state: s("address_state"),
    cnpj_status: s("cnpj_status"),
  };
}

const FIELD =
  "mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring";

export function PartnerEditForm({
  partnerId,
  initialFullName,
  initialEmail,
  initialProfile,
}: {
  partnerId: string;
  initialFullName: string;
  initialEmail: string;
  initialProfile: RawProfile;
}) {
  const router = useRouter();
  const [fullName, setFullName] = useState(initialFullName);
  const [email, setEmail] = useState(initialEmail);
  const [profile, setProfile] = useState<ProfileValue>(() => buildInitial(initialProfile));
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleChange(patch: Partial<ProfileValue>) {
    setProfile((prev) => ({ ...prev, ...patch }));
  }

  function cancel() {
    router.push(`/partners/${partnerId}?tab=identidade`);
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const payout = toPayoutPayload(profile);
    startTransition(async () => {
      const res = await updatePartnerRegistrationAction({
        partnerId,
        fullName,
        email,
        profile: toProfilePayload(profile),
        payoutMethods: payout ? [payout] : [],
      });
      if (res.ok) {
        router.push(`/partners/${partnerId}?tab=identidade`);
        router.refresh();
      } else {
        setError(res.message ?? res.error);
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6 max-w-2xl">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="edit-name" className="block text-sm font-medium">Nome</label>
          <input id="edit-name" value={fullName} onChange={(e) => setFullName(e.target.value)}
            minLength={2} maxLength={120} required className={FIELD} />
        </div>
        <div>
          <label htmlFor="edit-email" className="block text-sm font-medium">Email</label>
          <input id="edit-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
            required className={FIELD} />
        </div>
      </div>

      <div className="border-t pt-6">
        <h2 className="font-semibold text-sm mb-4">Dados de cadastro</h2>
        <p className="text-xs text-muted-foreground mb-4">
          O documento (CPF/CNPJ) fica oculto; deixe em branco para manter o atual, ou redigite para trocar.
        </p>
        <PartnerProfileFields value={profile} onChange={handleChange} />
      </div>

      {error ? (
        <p className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <div className="flex items-center gap-3">
        <button type="submit" disabled={pending}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50">
          {pending ? "Salvando..." : "Salvar cadastro"}
        </button>
        <button type="button" onClick={cancel}
          className="rounded-lg border border-input px-4 py-2 text-sm hover:bg-muted">
          Cancelar
        </button>
      </div>
    </form>
  );
}
