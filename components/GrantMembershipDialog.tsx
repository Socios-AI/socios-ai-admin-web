"use client";

import { useMemo, useState } from "react";
import { roleOptionsFromCatalog } from "@/lib/grant-membership-options";
import { Dialog, DialogFooter } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type App = {
  slug: string;
  name: string;
  role_catalog: Record<string, string>;
  niche_catalog: Record<string, string>;
};

type NicheOrg = { id: string; name: string | null; niche: string };

type Props = {
  open: boolean;
  apps: App[];
  nicheOrgs: NicheOrg[];
  onSubmit: (input: { appSlug: string; roleSlug: string; orgId?: string }) => void;
  onCancel: () => void;
};

export function GrantMembershipDialog({ open, apps, nicheOrgs, onSubmit, onCancel }: Props) {
  const [appSlug, setAppSlug] = useState(apps[0]?.slug ?? "");
  const [roleSlug, setRoleSlug] = useState<string>(
    roleOptionsFromCatalog(apps.find((a) => a.slug === appSlug)?.role_catalog)[0]?.slug ?? "",
  );
  const [orgId, setOrgId] = useState("");

  const app = apps.find((a) => a.slug === appSlug);
  const roleOptions = useMemo(() => roleOptionsFromCatalog(app?.role_catalog), [app]);
  // Apps multi-nicho (beauty) escolhem a conta numa lista de tenants existentes.
  // Criar um cliente NOVO é o fluxo "Novo cliente" (create_org_for_app), não aqui.
  const nicheCatalog = app?.niche_catalog ?? {};
  const isNicheApp = Object.keys(nicheCatalog).length > 0;

  function onAppChange(next: string) {
    setAppSlug(next);
    const nextApp = apps.find((a) => a.slug === next);
    setRoleSlug(roleOptionsFromCatalog(nextApp?.role_catalog)[0]?.slug ?? "");
    setOrgId("");
  }

  const submittable = roleSlug !== "";

  return (
    <Dialog open={open} onClose={onCancel} title="Conceder membership" size="md">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!submittable) return;
          onSubmit({
            appSlug,
            roleSlug,
            orgId: orgId.trim() ? orgId.trim() : undefined,
          });
        }}
        className="space-y-4"
      >
        <Field label="App" htmlFor="g-app">
          <Select id="g-app" value={appSlug} onChange={(e) => onAppChange(e.target.value)}>
            {apps.map((a) => (
              <option key={a.slug} value={a.slug}>{a.name}</option>
            ))}
          </Select>
        </Field>

        {/* Papéis vêm do role_catalog do app. Com um único papel (ex. beauty),
            não faz sentido escolher · mostramos o papel fixo. */}
        <Field label="Papel" htmlFor="g-role">
          {roleOptions.length === 0 ? (
            <p className="text-sm text-destructive">
              Este app não tem papéis no catálogo.
            </p>
          ) : roleOptions.length === 1 ? (
            <p className="text-sm text-muted-foreground">
              {roleOptions[0].label} <span className="font-mono text-xs">({roleOptions[0].slug})</span>
            </p>
          ) : (
            <Select id="g-role" value={roleSlug} onChange={(e) => setRoleSlug(e.target.value)}>
              {roleOptions.map((r) => (
                <option key={r.slug} value={r.slug}>{r.label} ({r.slug})</option>
              ))}
            </Select>
          )}
        </Field>

        {isNicheApp ? (
          <Field
            label="Conta (opcional)"
            htmlFor="g-org"
            hint="Anexa o usuário a um salão que já existe. Para cadastrar um cliente novo, use Organizações › Novo cliente."
          >
            <Select id="g-org" value={orgId} onChange={(e) => setOrgId(e.target.value)}>
              <option value="">Sem conta (acesso ao app)</option>
              {nicheOrgs.map((o) => (
                <option key={o.id} value={o.id}>
                  {(o.name ?? o.id)}
                  {o.niche ? ` · ${nicheCatalog[o.niche] ?? o.niche}` : ""}
                </option>
              ))}
            </Select>
          </Field>
        ) : (
          <Field
            label="Org ID (opcional)"
            htmlFor="g-org-id"
            hint="Preencha só se o papel for escopado a um tenant/org específico."
          >
            <Input
              id="g-org-id"
              type="text"
              value={orgId}
              onChange={(e) => setOrgId(e.target.value)}
              placeholder="00000000-0000-0000-0000-000000000000"
              className="font-mono"
            />
          </Field>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
          <Button type="submit" disabled={!submittable}>Conceder</Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
