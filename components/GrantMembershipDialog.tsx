"use client";

import { useMemo, useState } from "react";
import {
  roleOptionsFromCatalog,
  nicheOptionsFromCatalog,
  filterOrgsByNiche,
} from "@/lib/grant-membership-options";
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
  const firstApp = apps.find((a) => a.slug === appSlug);
  const [roleSlug, setRoleSlug] = useState<string>(
    roleOptionsFromCatalog(firstApp?.role_catalog)[0]?.slug ?? "",
  );
  const [niche, setNiche] = useState("");
  const [orgId, setOrgId] = useState("");

  const app = apps.find((a) => a.slug === appSlug);
  const roleOptions = useMemo(() => roleOptionsFromCatalog(app?.role_catalog), [app]);
  const nicheOptions = useMemo(() => nicheOptionsFromCatalog(app?.niche_catalog), [app]);
  const hasNiche = nicheOptions.length > 0;
  const orgsForNiche = useMemo(
    () => (niche ? filterOrgsByNiche(nicheOrgs, niche) : []),
    [nicheOrgs, niche],
  );

  function onAppChange(next: string) {
    setAppSlug(next);
    const nextApp = apps.find((a) => a.slug === next);
    setRoleSlug(roleOptionsFromCatalog(nextApp?.role_catalog)[0]?.slug ?? "");
    setNiche("");
    setOrgId("");
  }

  function onNicheChange(next: string) {
    setNiche(next);
    setOrgId("");
  }

  const submittable =
    roleSlug !== "" && (hasNiche ? niche !== "" && orgId !== "" : true);

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

        {hasNiche ? (
          <>
            <Field label="Nicho" htmlFor="g-niche">
              <Select
                id="g-niche"
                required
                value={niche}
                onChange={(e) => onNicheChange(e.target.value)}
              >
                <option value="">Selecione o nicho…</option>
                {nicheOptions.map((n) => (
                  <option key={n.key} value={n.key}>{n.label}</option>
                ))}
              </Select>
            </Field>

            <Field label="Conta (tenant)" htmlFor="g-org">
              <Select
                id="g-org"
                required
                value={orgId}
                onChange={(e) => setOrgId(e.target.value)}
                disabled={!niche || orgsForNiche.length === 0}
              >
                <option value="">
                  {!niche
                    ? "Escolha um nicho primeiro"
                    : orgsForNiche.length === 0
                      ? "Nenhuma conta neste nicho"
                      : "Selecione a conta…"}
                </option>
                {orgsForNiche.map((o) => (
                  <option key={o.id} value={o.id}>{o.name ?? o.id}</option>
                ))}
              </Select>
            </Field>
          </>
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
