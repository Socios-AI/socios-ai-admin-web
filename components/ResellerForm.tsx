"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { createResellerAction } from "@/app/_actions/create-reseller";
import { PartnerProfileFields, emptyProfileValue, toProfilePayload, toPayoutPayload, type ProfileValue } from "./PartnerProfileFields";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Button, buttonClasses } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function ResellerForm() {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ partnerId: string; recoveryEmailSent: boolean } | null>(
    null,
  );
  const [profile, setProfile] = useState<ProfileValue>(emptyProfileValue);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    const fd = new FormData(e.currentTarget);
    const payoutPayload = toPayoutPayload(profile);
    const payload = {
      email: String(fd.get("email") ?? "").trim(),
      fullName: String(fd.get("fullName") ?? "").trim(),
      customCommissionPct: fd.get("customCommissionPct")
        ? Number(fd.get("customCommissionPct"))
        : undefined,
      profile: toProfilePayload(profile),
      payoutMethods: payoutPayload ? [payoutPayload] : [],
    };
    startTransition(async () => {
      const res = await createResellerAction(payload);
      if (!res.ok) {
        const msg = res.message ?? res.error;
        setError(msg);
        toast.error(msg);
        return;
      }
      setSuccess({ partnerId: res.partnerId, recoveryEmailSent: res.recoveryEmailSent });
      toast.success("Revendedor criado.");
    });
  }

  if (success) {
    return (
      <div className="max-w-xl space-y-4">
        <div className="space-y-2 rounded-lg border border-primary/40 bg-primary/10 p-4 text-sm">
          <Badge variant="success">Revendedor criado</Badge>
          <p className="text-muted-foreground">
            {success.recoveryEmailSent
              ? "Email de set-password enviado."
              : "Falha ao enviar email de set-password (reenvie manualmente)."}
          </p>
        </div>
        <div className="flex gap-3">
          <Link
            href={`/partners/${success.partnerId}`}
            className={buttonClasses({ variant: "secondary" })}
          >
            Ver revendedor
          </Link>
          <Link href="/partners" className={buttonClasses({ variant: "outline" })}>
            Voltar para a lista
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="max-w-xl space-y-5">
      <Field label="Email" htmlFor="email" required>
        <Input id="email" name="email" type="email" required />
      </Field>
      <Field label="Nome completo" htmlFor="fullName" required>
        <Input id="fullName" name="fullName" type="text" required />
      </Field>
      <Field
        label="Comissão custom (opcional, 0 a 1)"
        htmlFor="customCommissionPct"
        hint="Em branco usa o valor fixo padrão (commission_config). Comissão real de revendedor é valor fixo, não percentual; este campo só sobrescreve se houver acordo específico."
      >
        <Input
          id="customCommissionPct"
          name="customCommissionPct"
          type="number"
          step="0.0001"
          min="0"
          max="1"
          placeholder="ex: 0.10 (10%)"
        />
      </Field>

      <PartnerProfileFields value={profile} onChange={(patch) => setProfile((p) => ({ ...p, ...patch }))} />

      {error ? (
        <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <Button type="submit" loading={pending}>
        Criar revendedor
      </Button>
    </form>
  );
}
