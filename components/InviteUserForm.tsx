"use client";

import { useState, useMemo, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { inviteUserAction } from "@/app/_actions/invite-user";
import { PartnerPicker } from "@/components/PartnerPicker";
import type { PartnerSearchRow } from "@/app/_actions/search-partners";
import { deriveAdminRoleSlug } from "@/lib/admin-role-slug";
import { Card, CardContent } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { copyToClipboard } from "@/lib/ui/clipboard";

type AppOption = { slug: string; name: string; role_catalog: Record<string, string> };
type Props = { apps: AppOption[] };

export function InviteUserForm({ apps }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [appSlug, setAppSlug] = useState(apps[0]?.slug ?? "");

  // Esta tela cadastra somente quem ADMINISTRA a conta: derivamos o papel de
  // admin do app (tenant-admin > <app>-admin > org_admin) e não expomos os
  // demais papéis (member etc.). Membros comuns são adicionados depois pelo
  // próprio admin dentro do app.
  const roleOptions = useMemo(() => {
    const app = apps.find((a) => a.slug === appSlug);
    const catalog = app?.role_catalog ?? {};
    const adminSlug = deriveAdminRoleSlug(catalog, appSlug);
    if (!adminSlug) return [];
    return [{ slug: adminSlug, label: catalog[adminSlug] ?? adminSlug }];
  }, [apps, appSlug]);

  const [roleSlug, setRoleSlug] = useState<string>(roleOptions[0]?.slug ?? "");
  const [orgId, setOrgId] = useState("");
  const [indicante, setIndicante] = useState<PartnerSearchRow | null>(null);
  const [actionLink, setActionLink] = useState<string | null>(null);

  function onAppChange(nextSlug: string) {
    setAppSlug(nextSlug);
    const app = apps.find((a) => a.slug === nextSlug);
    const adminSlug = deriveAdminRoleSlug(app?.role_catalog ?? {}, nextSlug) ?? "";
    setRoleSlug(adminSlug);
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
      <Card className="max-w-xl">
        <CardContent className="space-y-4 p-6">
          <h2 className="font-display font-semibold text-lg">Link gerado</h2>
          <p className="text-sm text-muted-foreground">
            Envie o link abaixo para o novo usuário definir a senha. O link expira em 24 horas.
          </p>
          <Textarea
            readOnly
            value={actionLink}
            className="font-mono text-xs"
            rows={3}
            onFocus={(e) => e.currentTarget.select()}
          />
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => copyToClipboard(actionLink, "Link copiado")}
            >
              Copiar link
            </Button>
            <Button type="button" onClick={() => router.push("/users")}>
              Voltar para Usuários
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="max-w-xl">
      <CardContent className="p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="Email" htmlFor="email" required>
            <Input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </Field>

          <Field label="Nome completo" htmlFor="fullName" required>
            <Input
              id="fullName"
              type="text"
              required
              minLength={2}
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          </Field>

          <Field label="App" htmlFor="app" required>
            <Select
              id="app"
              required
              value={appSlug}
              onChange={(e) => onAppChange(e.target.value)}
            >
              {apps.map((a) => (
                <option key={a.slug} value={a.slug}>{a.name}</option>
              ))}
            </Select>
          </Field>

          <Field
            label="Role"
            htmlFor="role"
            required
            hint="Esta tela cadastra apenas o administrador da conta. Membros comuns são adicionados depois pelo próprio admin dentro do app."
          >
            <Select
              id="role"
              required
              value={roleSlug}
              onChange={(e) => setRoleSlug(e.target.value)}
              disabled={roleOptions.length === 0}
            >
              {roleOptions.length === 0 ? (
                <option value="">Este app não tem papel de admin no catálogo</option>
              ) : (
                roleOptions.map((r) => (
                  <option key={r.slug} value={r.slug}>{r.label} ({r.slug})</option>
                ))
              )}
            </Select>
          </Field>

          <Field
            label="Org ID (opcional)"
            htmlFor="orgId"
            hint="Preencha só se o papel for escopado a um tenant/org específico."
          >
            <Input
              id="orgId"
              type="text"
              value={orgId}
              onChange={(e) => setOrgId(e.target.value)}
              placeholder="00000000-0000-0000-0000-000000000000"
              className="font-mono"
            />
          </Field>

          <PartnerPicker value={indicante} onChange={setIndicante} />

          <Button type="submit" loading={pending} disabled={pending}>
            {pending ? "Criando..." : "Convidar"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
