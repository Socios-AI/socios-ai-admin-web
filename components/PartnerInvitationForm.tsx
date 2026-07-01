"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { createPartnerInvitationAction } from "@/app/_actions/create-partner-invitation";
import { PartnerProfileFields, emptyProfileValue, toProfilePayload, toPayoutPayload, type ProfileValue } from "./PartnerProfileFields";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { copyToClipboard } from "@/lib/ui/clipboard";

const ERROR_LABEL: Record<string, string> = {
  FORBIDDEN:             "Sem permissão.",
  VALIDATION:            "Dados inválidos.",
  DROPBOX_SIGN_ERROR:    "Falha ao gerar contrato.",
  STRIPE_CONNECT_ERROR:  "Falha ao gerar link de pagamento.",
  API_ERROR:             "Erro na API.",
};

export type Recruiter = { id: string; label: string };
type Props = { recruiters?: Recruiter[] };

export function PartnerInvitationForm({ recruiters = [] }: Props) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ url: string; mocked: boolean } | null>(null);
  const [profile, setProfile] = useState<ProfileValue>(emptyProfileValue);
  const [introducedByPartnerId, setIntroducedByPartnerId] = useState("");

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null); setSuccess(null);
    const fd = new FormData(e.currentTarget);
    const payoutPayload = toPayoutPayload(profile);
    const prefillProfile = {
      ...toProfilePayload(profile),
      payout_methods: payoutPayload ? [payoutPayload] : [],
    };
    const payload = {
      email: String(fd.get("email") ?? "").trim(),
      fullName: String(fd.get("fullName") ?? "").trim(),
      licenseAmountUsd: Number(fd.get("licenseAmountUsd")),
      installments: Number(fd.get("installments") ?? 1),
      expiresInDays: Number(fd.get("expiresInDays") ?? 30),
      customCommissionPct: fd.get("customCommissionPct")
        ? Number(fd.get("customCommissionPct"))
        : undefined,
      introducedByPartnerId: introducedByPartnerId || undefined,
      prefillProfile,
    };
    startTransition(async () => {
      const r = await createPartnerInvitationAction(payload);
      if (r.ok) {
        setSuccess({ url: r.invite_url, mocked: r.mocked_dropbox_sign || r.mocked_stripe_connect });
        toast.success("Convite criado.");
      } else {
        const msg = r.message ?? ERROR_LABEL[r.error] ?? "Erro desconhecido.";
        setError(msg);
        toast.error(msg);
      }
    });
  };

  return (
    <form onSubmit={onSubmit} className="max-w-xl space-y-5">
      <Field label="Email" htmlFor="email" required>
        <Input id="email" name="email" type="email" required />
      </Field>
      <Field label="Nome completo" htmlFor="fullName" required>
        <Input id="fullName" name="fullName" type="text" required minLength={2} />
      </Field>
      {recruiters.length > 0 && (
        <Field
          label="Recrutador (quem indicou)"
          htmlFor="introducedByPartnerId"
          hint="Define sob quem o novo parceiro entra na árvore. Deixe na raiz se a Sócios AI licenciou direto."
        >
          <Select
            id="introducedByPartnerId"
            name="introducedByPartnerId"
            value={introducedByPartnerId}
            onChange={(e) => setIntroducedByPartnerId(e.target.value)}
          >
            <option value="">Sócios AI (raiz)</option>
            {recruiters.map((r) => (
              <option key={r.id} value={r.id}>{r.label}</option>
            ))}
          </Select>
        </Field>
      )}
      <div className="grid grid-cols-2 gap-4">
        <Field label="Valor da licença (USD)" htmlFor="licenseAmountUsd" required>
          <Input id="licenseAmountUsd" name="licenseAmountUsd" type="number" required min={1} step="0.01" defaultValue={10000} />
        </Field>
        <Field label="Parcelas" htmlFor="installments">
          <Select id="installments" name="installments" defaultValue={1}>
            {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>{n}x</option>
            ))}
          </Select>
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Comissão custom (0-1, opcional)" htmlFor="customCommissionPct">
          <Input id="customCommissionPct" name="customCommissionPct" type="number" min={0} max={1} step="0.01" placeholder="ex: 0.5" />
        </Field>
        <Field label="Validade (dias)" htmlFor="expiresInDays">
          <Input id="expiresInDays" name="expiresInDays" type="number" min={1} max={60} defaultValue={30} />
        </Field>
      </div>
      <PartnerProfileFields value={profile} onChange={(patch) => setProfile((p) => ({ ...p, ...patch }))} />

      {error && <p className="text-sm text-destructive">{error}</p>}
      {success && (
        <div className="space-y-2 rounded-lg border border-primary/40 bg-primary/10 p-4 text-sm">
          <div className="flex items-center gap-2">
            <Badge variant="success">Convite criado</Badge>
            {success.mocked ? <Badge variant="muted">modo mock</Badge> : null}
          </div>
          <div className="flex items-center gap-2">
            <code className="break-all text-xs">{success.url}</code>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => copyToClipboard(success.url, "Link copiado.")}
            >
              Copiar
            </Button>
          </div>
        </div>
      )}
      <Button type="submit" loading={pending}>
        Enviar convite
      </Button>
    </form>
  );
}
