"use client";

import { useState, useMemo, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { inviteUserAction } from "@/app/_actions/invite-user";
import { PartnerPicker } from "@/components/PartnerPicker";
import type { PartnerSearchRow } from "@/app/_actions/search-partners";

type AppOption = { slug: string; name: string; role_catalog: Record<string, string> };
type Props = { apps: AppOption[] };

export function InviteUserForm({ apps }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [appSlug, setAppSlug] = useState(apps[0]?.slug ?? "");

  // Roles vêm do role_catalog do app selecionado (fonte da verdade), não de lista fixa.
  const roleOptions = useMemo(() => {
    const app = apps.find((a) => a.slug === appSlug);
    return Object.entries(app?.role_catalog ?? {}).map(([slug, label]) => ({ slug, label }));
  }, [apps, appSlug]);

  const [roleSlug, setRoleSlug] = useState<string>(roleOptions[0]?.slug ?? "");
  const [orgId, setOrgId] = useState("");
  const [indicante, setIndicante] = useState<PartnerSearchRow | null>(null);
  const [actionLink, setActionLink] = useState<string | null>(null);

  function onAppChange(nextSlug: string) {
    setAppSlug(nextSlug);
    const app = apps.find((a) => a.slug === nextSlug);
    const firstRole = Object.keys(app?.role_catalog ?? {})[0] ?? "";
    setRoleSlug(firstRole);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!roleSlug) {
      toast.error("Selecione uma role válida para este app.");
      return;
    }
    startTransition(async () => {
      try {
        const res = await inviteUserAction({
          email,
          fullName,
          appSlug,
          roleSlug,
          orgId: orgId.trim() ? orgId.trim() : undefined,
          introducedByPartnerId: indicante?.partnerId,
        });
        if (!res.ok) {
          toast.error(res.message ?? `Falha ao convidar usuário (${res.error})`);
          return;
        }
        toast.success("Usuário criado. Link de boas-vindas gerado.");
        setActionLink(res.actionLink);
      } catch {
        // Sessão expirada: o server action é redirecionado pro login (cross-origin),
        // que o browser bloqueia como "Failed to fetch". Em vez do erro, manda pro login.
        const from = encodeURIComponent(window.location.href);
        window.location.href = `https://id.sociosai.com/login?from=${from}`;
      }
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
          onChange={(e) => onAppChange(e.target.value)}
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
          disabled={roleOptions.length === 0}
        >
          {roleOptions.length === 0 ? (
            <option value="">Este app não tem papéis no catálogo</option>
          ) : (
            roleOptions.map((r) => (
              <option key={r.slug} value={r.slug}>{r.label} ({r.slug})</option>
            ))
          )}
        </select>
        <p className="text-xs text-muted-foreground">Papéis vêm do catálogo do app selecionado.</p>
      </div>
      <div className="space-y-1.5">
        <label htmlFor="orgId" className="text-sm font-medium">Org ID (opcional)</label>
        <input
          id="orgId"
          type="text"
          value={orgId}
          onChange={(e) => setOrgId(e.target.value)}
          placeholder="00000000-0000-0000-0000-000000000000"
          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm font-mono"
        />
        <p className="text-xs text-muted-foreground">
          Preencha só se o papel for escopado a um tenant/org específico.
        </p>
      </div>
      <PartnerPicker value={indicante} onChange={setIndicante} />
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
