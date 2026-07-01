"use client";

import { useState, useTransition } from "react";
import { Copy, Check } from "lucide-react";
import { createOrgInvitationAction } from "@/app/_actions/create-org-invitation";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { copyToClipboard } from "@/lib/ui/clipboard";

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

  if (success) {
    return (
      <div className="space-y-3">
        <div className="rounded-md border border-primary/40 bg-primary/10 p-3 text-sm">
          Convite criado. Envie o link abaixo.
        </div>
        <div className="flex items-center gap-2">
          <code className="min-w-0 flex-1 truncate rounded-md bg-background px-2 py-1.5 font-mono text-xs">
            {success.inviteUrl}
          </code>
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label="Copiar link"
            onClick={async () => {
              const ok = await copyToClipboard(success.inviteUrl, "Link copiado");
              if (ok) {
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              }
            }}
          >
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          </Button>
        </div>
        <Button type="button" variant="ghost" size="sm" onClick={reset}>
          Convidar outro membro
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <Field label="Email" htmlFor="org-inv-email" required>
        <Input
          id="org-inv-email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Role" htmlFor="org-inv-role">
          <Select
            id="org-inv-role"
            value={roleSlug}
            onChange={(e) => setRoleSlug(e.target.value as Role)}
          >
            <option value="org_user">Org User</option>
            <option value="org_admin">Org Admin</option>
          </Select>
        </Field>
        <Field label="Expira (dias)" htmlFor="org-inv-exp">
          <Input
            id="org-inv-exp"
            type="number"
            min={1}
            max={30}
            value={expiresInDays}
            onChange={(e) => setExpiresInDays(parseInt(e.target.value, 10) || 7)}
          />
        </Field>
      </div>

      {error ? (
        <p
          role="alert"
          className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive"
        >
          {error}
        </p>
      ) : null}

      <Button type="submit" loading={pending} className="w-full">
        {pending ? "Criando..." : "Criar convite"}
      </Button>
    </form>
  );
}
