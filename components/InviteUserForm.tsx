"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ROLES, roleRequiresOrg } from "@/lib/roles";
import { inviteUserAction } from "@/app/_actions/invite-user";

type Props = { apps: Array<{ slug: string; name: string }> };

export function InviteUserForm({ apps }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [appSlug, setAppSlug] = useState(apps[0]?.slug ?? "");
  const [roleSlug, setRoleSlug] = useState<string>("end-user");
  const [orgId, setOrgId] = useState("");
  const [actionLink, setActionLink] = useState<string | null>(null);

  const requiresOrg = roleRequiresOrg(roleSlug);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const res = await inviteUserAction({
        email,
        fullName,
        appSlug,
        roleSlug,
        orgId: requiresOrg ? orgId : undefined,
      });
      if (!res.ok) {
        toast.error(res.message ?? "Falha ao convidar usuário");
        return;
      }
      toast.success("Usuário criado. Link de boas-vindas gerado.");
      setActionLink(res.actionLink);
    });
  }

  if (actionLink) {
    return (
      <div className="space-y-4 rounded-2xl border border-border bg-card p-6">
        <h2 className="font-display font-semibold text-lg">Link gerado</h2>
        <p className="text-sm text-muted-foreground">
          Envie o link abaixo para o novo usuário definir a senha. O link expira em 24 horas.
        </p>
        <textarea
          readOnly
          value={actionLink}
          className="w-full font-mono text-xs rounded-lg border border-input bg-background p-3"
          rows={3}
          onFocus={(e) => e.currentTarget.select()}
        />
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => navigator.clipboard.writeText(actionLink).then(() => toast.success("Link copiado"))}
            className="rounded-lg border border-input px-4 py-2 text-sm hover:bg-muted"
          >
            Copiar link
          </button>
          <button
            type="button"
            onClick={() => router.push("/users")}
            className="rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:opacity-90"
          >
            Voltar para Usuários
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-xl">
      <div className="space-y-1.5">
        <label htmlFor="email" className="text-sm font-medium">Email</label>
        <input
          id="email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
        />
      </div>
      <div className="space-y-1.5">
        <label htmlFor="fullName" className="text-sm font-medium">Nome completo</label>
        <input
          id="fullName"
          type="text"
          required
          minLength={2}
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
        />
      </div>
      <div className="space-y-1.5">
        <label htmlFor="app" className="text-sm font-medium">App</label>
        <select
          id="app"
          required
          value={appSlug}
          onChange={(e) => setAppSlug(e.target.value)}
          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
        >
          {apps.map((a) => (
            <option key={a.slug} value={a.slug}>{a.name}</option>
          ))}
        </select>
      </div>
      <div className="space-y-1.5">
        <label htmlFor="role" className="text-sm font-medium">Role</label>
        <select
          id="role"
          required
          value={roleSlug}
          onChange={(e) => setRoleSlug(e.target.value)}
          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
        >
          {ROLES.map((r) => (
            <option key={r.slug} value={r.slug}>{r.label}</option>
          ))}
        </select>
      </div>
      {requiresOrg && (
        <div className="space-y-1.5">
          <label htmlFor="orgId" className="text-sm font-medium">Org ID (UUID)</label>
          <input
            id="orgId"
            type="text"
            required
            value={orgId}
            onChange={(e) => setOrgId(e.target.value)}
            placeholder="00000000-0000-0000-0000-000000000000"
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm font-mono"
          />
          <p className="text-xs text-muted-foreground">Esta role exige org_id.</p>
        </div>
      )}
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-primary text-primary-foreground px-5 py-2.5 text-sm font-medium hover:opacity-90 disabled:opacity-50"
      >
        {pending ? "Criando..." : "Convidar"}
      </button>
    </form>
  );
}
