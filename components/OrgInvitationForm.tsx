"use client";

import { useState, useTransition } from "react";
import { createOrgInvitationAction } from "@/app/_actions/create-org-invitation";

type Role = "org_admin" | "org_user";

export function OrgInvitationForm({ orgId }: { orgId: string }) {
  const [email, setEmail] = useState("");
  const [roleSlug, setRoleSlug] = useState<Role>("org_user");
  const [expiresInDays, setExpiresInDays] = useState(7);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ inviteUrl: string } | null>(null);
  const [copied, setCopied] = useState(false);

  function reset() {
    setEmail("");
    setRoleSlug("org_user");
    setExpiresInDays(7);
    setError(null);
    setSuccess(null);
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await createOrgInvitationAction({
        orgId,
        email,
        roleSlug,
        expiresInDays,
      });
      if (!res.ok) {
        setError(res.message ?? res.error);
        return;
      }
      setSuccess({ inviteUrl: res.inviteUrl });
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
      <div className="space-y-3">
        <div className="rounded-lg border border-emerald-300 bg-emerald-50 dark:bg-emerald-950 dark:border-emerald-800 p-3 text-sm">
          Convite criado. Envie o link abaixo.
        </div>
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
        <button
          type="button"
          onClick={reset}
          className="text-sm text-muted-foreground hover:underline"
        >
          Convidar outro membro
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label htmlFor="org-inv-email" className="block text-sm font-medium mb-1">Email</label>
        <input
          id="org-inv-email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="org-inv-role" className="block text-sm font-medium mb-1">Role</label>
          <select
            id="org-inv-role"
            value={roleSlug}
            onChange={(e) => setRoleSlug(e.target.value as Role)}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
          >
            <option value="org_user">Org User</option>
            <option value="org_admin">Org Admin</option>
          </select>
        </div>
        <div>
          <label htmlFor="org-inv-exp" className="block text-sm font-medium mb-1">Expira (dias)</label>
          <input
            id="org-inv-exp"
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
