"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  PartnerProfileFields,
  emptyProfileValue,
  toProfilePayload,
  toPayoutPayload,
  type ProfileValue,
} from "@/components/PartnerProfileFields";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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

export function PartnerEditForm({
  partnerId,
  initialFullName,
  initialEmail,
  initialProfile,
  onDone,
  onCancel,
}: {
  partnerId: string;
  initialFullName: string;
  initialEmail: string;
  initialProfile: RawProfile;
  onDone?: () => void;
  onCancel?: () => void;
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
    if (onCancel) {
      onCancel();
      return;
    }
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
        toast.success("Cadastro atualizado.");
        if (onDone) {
          onDone();
        } else {
          router.push(`/partners/${partnerId}?tab=identidade`);
        }
        router.refresh();
      } else {
        const msg = res.message ?? res.error;
        setError(msg);
        toast.error(msg);
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="max-w-2xl space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <Field label="Nome" htmlFor="edit-name" required>
          <Input id="edit-name" value={fullName} onChange={(e) => setFullName(e.target.value)} minLength={2} maxLength={120} required />
        </Field>
        <Field label="Email" htmlFor="edit-email" required>
          <Input id="edit-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </Field>
      </div>

      <div className="border-t border-border pt-6">
        <h2 className="mb-1 text-sm font-semibold">Dados de cadastro</h2>
        <p className="mb-4 text-xs text-muted-foreground">
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
        <Button type="submit" loading={pending}>
          Salvar cadastro
        </Button>
        <Button type="button" variant="outline" onClick={cancel}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
