"use client";

import { useState, useTransition } from "react";
import { createPartnerInviteAction } from "@/app/_actions/create-partner-invite";
import { PartnerPicker } from "@/components/PartnerPicker";
import type { PartnerSearchRow } from "@/app/_actions/search-partners";

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
  const [result, setResult] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

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
        setResult({ kind: "ok", text: `Convite criado. Link de onboarding: ${r.invite_url}` });
      } else {
        setResult({ kind: "err", text: r.message ?? r.error });
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="max-w-xl space-y-4">
      <div className="space-y-1.5">
        <label htmlFor="role" className="text-sm font-medium">Papel</label>
        <select
          id="role"
          value={role}
          onChange={(e) => setRole(e.target.value as Role)}
          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
        >
          {ROLE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="email" className="text-sm font-medium">Email</label>
        <input id="email" type="email" required value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="fullName" className="text-sm font-medium">Nome completo</label>
        <input id="fullName" type="text" required minLength={2} value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" />
      </div>

      <PartnerPicker value={upline} onChange={setUpline} label="Indicado por (upline, opcional)" />

      <button type="submit" disabled={pending}
        className="rounded-lg bg-primary text-primary-foreground px-5 py-2.5 text-sm font-medium hover:opacity-90 disabled:opacity-50">
        {pending ? "Criando..." : "Criar convite"}
      </button>

      {result && (
        <p className={result.kind === "ok" ? "text-sm text-green-700 break-all" : "text-sm text-destructive"}>
          {result.text}
        </p>
      )}
    </form>
  );
}
