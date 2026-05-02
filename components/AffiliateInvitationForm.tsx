"use client";

import { useState, useTransition } from "react";
import { createAffiliateInvitationAction } from "@/app/_actions/create-affiliate-invitation";

export function AffiliateInvitationForm({ onCreated }: { onCreated?: () => void }) {
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [source, setSource] = useState("");
  const [expiresInDays, setExpiresInDays] = useState(7);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ inviteUrl: string } | null>(null);
  const [copied, setCopied] = useState(false);

  function reset() {
    setEmail("");
    setDisplayName("");
    setSource("");
    setExpiresInDays(7);
    setError(null);
    setSuccess(null);
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await createAffiliateInvitationAction({
        email,
        displayName,
        source: source || undefined,
        expiresInDays,
      });
      if (!res.ok) {
        setError(res.message ?? res.error);
        return;
      }
      setSuccess({ inviteUrl: res.inviteUrl });
      onCreated?.();
    });
  }

  async function copyLink() {
    if (!success) return;
    await navigator.clipboard.writeText(success.inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (success) {
    return (
      <div className="space-y-4">
        <div className="rounded-lg border border-emerald-300 bg-emerald-50 dark:bg-emerald-950 dark:border-emerald-800 p-4 text-sm">
          Convite criado. Envie o link abaixo para o influencer.
        </div>
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">
            Link do convite
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              readOnly
              value={success.inviteUrl}
              className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-xs font-mono"
            />
            <button
              type="button"
              onClick={copyLink}
              className="rounded-lg border border-border bg-secondary px-3 py-2 text-sm hover:bg-secondary/80"
            >
              {copied ? "Copiado!" : "Copiar"}
            </button>
          </div>
        </div>
        <button
          type="button"
          onClick={reset}
          className="text-sm text-muted-foreground hover:underline"
        >
          Criar outro convite
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label htmlFor="aff-email" className="block text-sm font-medium mb-1">Email</label>
        <input
          id="aff-email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
          placeholder="influencer@exemplo.com"
        />
      </div>
      <div>
        <label htmlFor="aff-name" className="block text-sm font-medium mb-1">Nome de exibição</label>
        <input
          id="aff-name"
          type="text"
          required
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="aff-source" className="block text-sm font-medium mb-1">Fonte (opcional)</label>
          <input
            id="aff-source"
            type="text"
            value={source}
            onChange={(e) => setSource(e.target.value)}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            placeholder="instagram, indicação, ..."
          />
        </div>
        <div>
          <label htmlFor="aff-exp" className="block text-sm font-medium mb-1">Expira em (dias)</label>
          <input
            id="aff-exp"
            type="number"
            min={1}
            max={30}
            value={expiresInDays}
            onChange={(e) => setExpiresInDays(parseInt(e.target.value, 10) || 7)}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
          />
        </div>
      </div>

      {error ? (
        <div role="alert" className="rounded-lg border border-red-300 bg-red-50 dark:bg-red-950 dark:border-red-800 p-3 text-sm">
          {error}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-primary text-primary-foreground py-2.5 text-sm font-medium hover:opacity-90 transition disabled:opacity-50"
      >
        {pending ? "Criando..." : "Criar convite"}
      </button>
    </form>
  );
}
