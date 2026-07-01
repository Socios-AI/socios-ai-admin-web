"use client";

import { useState } from "react";
import { ROLES, roleRequiresOrg } from "@/lib/roles";
import { Dialog, DialogFooter } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type App = { slug: string; name: string };

type Props = {
  open: boolean;
  apps: App[];
  onSubmit: (input: { appSlug: string; roleSlug: string; orgId?: string }) => void;
  onCancel: () => void;
};

export function GrantMembershipDialog({ open, apps, onSubmit, onCancel }: Props) {
  const [appSlug, setAppSlug] = useState(apps[0]?.slug ?? "");
  const [roleSlug, setRoleSlug] = useState<string>("end-user");
  const [orgId, setOrgId] = useState("");

  const requiresOrg = roleRequiresOrg(roleSlug);

  return (
    <Dialog open={open} onClose={onCancel} title="Conceder membership" size="md">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit({
            appSlug,
            roleSlug,
            orgId: requiresOrg ? orgId : undefined,
          });
        }}
        className="space-y-4"
      >
        <Field label="App" htmlFor="g-app">
          <Select id="g-app" value={appSlug} onChange={(e) => setAppSlug(e.target.value)}>
            {apps.map((a) => (
              <option key={a.slug} value={a.slug}>{a.name}</option>
            ))}
          </Select>
        </Field>

        <Field label="Role" htmlFor="g-role">
          <Select id="g-role" value={roleSlug} onChange={(e) => setRoleSlug(e.target.value)}>
            {ROLES.map((r) => (
              <option key={r.slug} value={r.slug}>{r.label}</option>
            ))}
          </Select>
        </Field>

        {requiresOrg && (
          <Field label="Org ID" htmlFor="g-org">
            <Input
              id="g-org"
              type="text"
              required
              value={orgId}
              onChange={(e) => setOrgId(e.target.value)}
              className="font-mono"
            />
          </Field>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
          <Button type="submit">Conceder</Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
