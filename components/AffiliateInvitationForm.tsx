"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Copy, Check } from "lucide-react";
import { createAffiliateInvitationAction } from "@/app/_actions/create-affiliate-invitation";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { copyToClipboard } from "@/lib/ui/clipboard";

export function AffiliateInvitationForm({ onCreated }: { onCreated?: () => void }) {
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [source, setSource] = useState("");
  const [expiresInDays, setExpiresInDays] = useState(7);
  const [pending, startTransition] = useTransition();
  const [success, setSuccess] = useState<{ inviteUrl: string } | null>(null);
  const [copied, setCopied] = useState(false);

  function reset() {
    setEmail("");
    setDisplayName("");
    setSource("");
    setExpiresInDays(7);
    setSuccess(null);
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const res = await createAffiliateInvitationAction({
        email,
        displayName,
        source: source || undefined,
        expiresInDays,
      });
      if (!res.ok) {
        toast.error(res.message ?? res.error);
        return;
      }
      setSuccess({ inviteUrl: res.inviteUrl });
      toast.success("Convite criado");
      onCreated?.();
    });
  }

  async function copyLink() {
    if (!success) return;
    const ok = await copyToClipboard(success.inviteUrl, "Link copiado");
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  if (success) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Convite criado. Envie o link abaixo para o influencer.
        </p>
        <Field label="Link do convite" htmlFor="aff-invite-url">
          <div className="flex gap-2">
            <Input
              id="aff-invite-url"
              type="text"
              readOnly
              value={success.inviteUrl}
              className="font-mono text-xs"
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={copyLink}
              aria-label="Copiar link"
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
        </Field>
        <Button type="button" variant="ghost" size="sm" onClick={reset}>
          Criar outro convite
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <Field label="Email" htmlFor="aff-email" required>
        <Input
          id="aff-email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="influencer@exemplo.com"
        />
      </Field>
      <Field label="Nome de exibição" htmlFor="aff-name" required>
        <Input
          id="aff-name"
          type="text"
          required
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
        />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Fonte (opcional)" htmlFor="aff-source">
          <Input
            id="aff-source"
            type="text"
            value={source}
            onChange={(e) => setSource(e.target.value)}
            placeholder="instagram, indicação, ..."
          />
        </Field>
        <Field label="Expira em (dias)" htmlFor="aff-exp">
          <Input
            id="aff-exp"
            type="number"
            min={1}
            max={30}
            value={expiresInDays}
            onChange={(e) => setExpiresInDays(parseInt(e.target.value, 10) || 7)}
          />
        </Field>
      </div>

      <Button type="submit" className="w-full" loading={pending}>
        {pending ? "Criando..." : "Criar convite"}
      </Button>
    </form>
  );
}
