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
