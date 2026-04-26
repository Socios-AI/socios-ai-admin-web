"use client";

import { useState } from "react";
import { ROLES, roleRequiresOrg } from "@/lib/roles";

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

  if (!open) return null;

  const requiresOrg = roleRequiresOrg(roleSlug);

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit({
            appSlug,
            roleSlug,
            orgId: requiresOrg ? orgId : undefined,
          });
        }}
        className="w-full max-w-md rounded-2xl border border-border bg-card p-6 space-y-4"
      >
        <h2 className="font-display font-semibold text-lg">Conceder membership</h2>

        <div className="space-y-1.5">
          <label htmlFor="g-app" className="text-sm font-medium">App</label>
          <select
            id="g-app"
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
          <label htmlFor="g-role" className="text-sm font-medium">Role</label>
          <select
            id="g-role"
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
            <label htmlFor="g-org" className="text-sm font-medium">Org ID</label>
            <input
              id="g-org"
              type="text"
              required
              value={orgId}
              onChange={(e) => setOrgId(e.target.value)}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm font-mono"
            />
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-input px-4 py-2 text-sm hover:bg-muted"
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:opacity-90"
          >
            Conceder
          </button>
        </div>
      </form>
    </div>
  );
}
