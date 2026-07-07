"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { createPartnerInviteAction } from "@/app/_actions/create-partner-invite";
import { PartnerPicker } from "@/components/PartnerPicker";
import type { PartnerSearchRow } from "@/app/_actions/search-partners";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { copyToClipboard } from "@/lib/ui/clipboard";
import { PartnerProfileFields, emptyProfileValue, type ProfileValue } from "@/components/PartnerProfileFields";

type Role = "licenciado" | "representante" | "embaixador";
const ROLE_OPTIONS: { value: Role; label: string }[] = [
  { value: "licenciado", label: "Licenciado" },
  { value: "representante", label: "Representante (revendedor)" },
  { value: "embaixador", label: "Embaixador" },
];

export function PartnerInviteForm({ initialRole = "representante" }: { initialRole?: Role }) {
  const [role, setRole] = useState<Role>(initialRole);
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [upline, setUpline] = useState<PartnerSearchRow | null>(null);
  const [commissionPct, setCommissionPct] = useState("");
  const [profile, setProfile] = useState<ProfileValue>(emptyProfileValue);
  const [licenseAmountUsd, setLicenseAmountUsd] = useState("15000");
  const [territory, setTerritory] = useState("Non-exclusive, no territorial restriction");
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<{ kind: "ok" | "err"; text: string; url?: string } | null>(null);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setResult(null);
    startTransition(async () => {
      const r = await createPartnerInviteAction({
        email,
        fullName,
        targetRole: role,
        introducedByPartnerId: upline?.partnerId,
        commissionPct: commissionPct.trim() === "" ? undefined : Number(commissionPct),
        ...(role === "licenciado"
          ? {
              licenseAmountUsd: licenseAmountUsd.trim() === "" ? undefined : Number(licenseAmountUsd),
              territory: territory.trim() || undefined,
              contractProfile: {
                country: profile.country,
                person_type: profile.person_type,
                tax_id: profile.tax_id || undefined,
                company_legal_name: profile.company_legal_name || undefined,
                company_trade_name: profile.company_trade_name || undefined,
                legal_rep_name: profile.legal_rep_name || undefined,
                legal_rep_tax_id: profile.legal_rep_tax_id || undefined,
                phone: profile.phone || undefined,
                address_postal_code: profile.address_postal_code || undefined,
                address_line1: profile.address_line1 || undefined,
                address_number: profile.address_number || undefined,
                address_complement: profile.address_complement || undefined,
                address_district: profile.address_district || undefined,
                address_city: profile.address_city || undefined,
                address_state: profile.address_state || undefined,
              },
            }
          : {}),
      });
      if (r.ok) {
        setResult({ kind: "ok", text: "Convite criado.", url: r.invite_url });
        toast.success("Convite criado.");
      } else {
        const text = r.message ?? r.error;
        setResult({ kind: "err", text });
        toast.error(text);
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="max-w-xl space-y-4">
      <Field label="Papel" htmlFor="role">
        <Select id="role" value={role} onChange={(e) => setRole(e.target.value as Role)}>
          {ROLE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </Select>
      </Field>

      <Field label="Email" htmlFor="email" required>
        <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
      </Field>

      <Field label="Nome completo" htmlFor="fullName" required>
        <Input id="fullName" type="text" required minLength={2} value={fullName} onChange={(e) => setFullName(e.target.value)} />
      </Field>

      <PartnerPicker value={upline} onChange={setUpline} label="Indicado por (upline, opcional)" />

      <Field
        label="Comissão (0 a 1, opcional)"
        htmlFor="commissionPct"
        hint="Fração do net que este parceiro ganha (ex.: 0,25 = 25%). Deve ser menor que a do upline."
      >
        <Input
          id="commissionPct"
          type="number"
          min={0}
          max={1}
          step={0.01}
          value={commissionPct}
          onChange={(e) => setCommissionPct(e.target.value)}
        />
      </Field>

      {role === "licenciado" && (
        <div className="space-y-4 rounded-lg border border-border p-4">
          <p className="text-sm font-medium">Dados do contrato</p>
          <PartnerProfileFields value={profile} onChange={(patch) => setProfile((p) => ({ ...p, ...patch }))} />
          <Field label="Valor da licença (USD)" htmlFor="licenseAmountUsd">
            <Input id="licenseAmountUsd" type="number" min={1} value={licenseAmountUsd} onChange={(e) => setLicenseAmountUsd(e.target.value)} />
          </Field>
          <Field label="Território" htmlFor="territory" hint="Exclusividade dispara revisão jurídica manual.">
            <Input id="territory" type="text" value={territory} onChange={(e) => setTerritory(e.target.value)} />
          </Field>
        </div>
      )}

      <Button type="submit" loading={pending}>
        Criar convite
      </Button>

      {result?.kind === "ok" && (
        <div className="space-y-2 rounded-lg border border-primary/40 bg-primary/10 p-4 text-sm">
          <Badge variant="success">Convite criado</Badge>
          {result.url ? (
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Link de onboarding:</span>
              <code className="break-all text-xs">{result.url}</code>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => copyToClipboard(result.url!, "Link copiado.")}
              >
                Copiar
              </Button>
            </div>
          ) : null}
        </div>
      )}
      {result?.kind === "err" && (
        <p className="text-sm text-destructive">{result.text}</p>
      )}
    </form>
  );
}
