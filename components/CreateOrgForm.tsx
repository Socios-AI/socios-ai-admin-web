"use client";

import { useState, useTransition, useRef } from "react";
import { createOrgWithIntroducerAction } from "@/app/_actions/create-org-with-introducer";
import { searchPartnersAction, type PartnerSearchRow } from "@/app/_actions/search-partners";

type AppOption = {
  slug: string;
  name: string;
  nicheCatalog?: Record<string, string> | null;
};

const ROLE_LABEL: Record<string, string> = {
  licenciado: "Licenciado",
  representante: "Representante",
  embaixador: "Embaixador",
  afiliado: "Afiliado",
};

export function CreateOrgForm({ apps }: { apps: AppOption[] }) {
  const [appSlug, setAppSlug] = useState(apps[0]?.slug ?? "");
  const [tenantName, setTenantName] = useState("");
  const [tenantSlug, setTenantSlug] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [niche, setNiche] = useState("");

  const [partnerQuery, setPartnerQuery] = useState("");
  const [partnerResults, setPartnerResults] = useState<PartnerSearchRow[]>([]);
  const [selectedPartner, setSelectedPartner] = useState<PartnerSearchRow | null>(null);
  const [searching, setSearching] = useState(false);

  const searchSeq = useRef(0);

  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const selectedApp = apps.find((a) => a.slug === appSlug);
  const nicheCatalog = selectedApp?.nicheCatalog ?? null;
  const requiresNiche = !!nicheCatalog && Object.keys(nicheCatalog).length > 0;

  async function runSearch(q: string) {
    const seq = ++searchSeq.current;
    setPartnerQuery(q);
    setSelectedPartner(null);
    if (q.trim().length < 2) {
      setPartnerResults([]);
      return;
    }
    setSearching(true);
    const res = await searchPartnersAction(q);
    if (seq !== searchSeq.current) return; // resposta obsoleta, ignora
    setSearching(false);
    setPartnerResults(res.ok ? res.partners : []);
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    startTransition(async () => {
      const res = await createOrgWithIntroducerAction({
        appSlug,
        tenantName,
        tenantSlug,
        adminEmail,
        niche: requiresNiche ? niche : undefined,
        introducedByPartnerId: selectedPartner?.partnerId,
      });
      if (res.ok) {
        const who = res.tenant.introducedByPartnerId ? " (indicante registrado)" : "";
        setMessage({
          kind: "ok",
          text: `Cliente "${res.tenant.tenantName}" criado${who}. Convite ${
            res.tenant.emailSent ? "enviado" : "gerado"
          }: ${res.tenant.inviteUrl}`,
        });
      } else {
        setMessage({ kind: "err", text: res.message ?? res.error });
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="max-w-xl space-y-4">
      <div>
        <label htmlFor="appSlug" className="block text-sm font-medium">App</label>
        <select
          id="appSlug"
          value={appSlug}
          onChange={(e) => setAppSlug(e.target.value)}
          className="mt-1 w-full rounded border px-3 py-2"
          required
        >
          {apps.map((a) => (
            <option key={a.slug} value={a.slug}>{a.name}</option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="tenantName" className="block text-sm font-medium">Nome do cliente</label>
        <input id="tenantName" value={tenantName} onChange={(e) => setTenantName(e.target.value)}
          minLength={2} maxLength={100} required className="mt-1 w-full rounded border px-3 py-2" />
      </div>

      <div>
        <label htmlFor="tenantSlug" className="block text-sm font-medium">Slug (URL)</label>
        <input id="tenantSlug" value={tenantSlug}
          onChange={(e) => setTenantSlug(e.target.value.toLowerCase())}
          pattern="[a-z0-9](?:[a-z0-9-]{1,46}[a-z0-9])?" required
          className="mt-1 w-full rounded border px-3 py-2" />
      </div>

      <div>
        <label htmlFor="adminEmail" className="block text-sm font-medium">Email do responsável</label>
        <input id="adminEmail" type="email" value={adminEmail}
          onChange={(e) => setAdminEmail(e.target.value)} required
          className="mt-1 w-full rounded border px-3 py-2" />
      </div>

      {requiresNiche && (
        <div>
          <label htmlFor="niche" className="block text-sm font-medium">Nicho</label>
          <select id="niche" value={niche} onChange={(e) => setNiche(e.target.value)} required
            className="mt-1 w-full rounded border px-3 py-2">
            <option value="">Selecione...</option>
            {Object.entries(nicheCatalog!).map(([slug, label]) => (
              <option key={slug} value={slug}>{label}</option>
            ))}
          </select>
        </div>
      )}

      <div>
        <label htmlFor="partnerQuery" className="block text-sm font-medium">
          Indicado por (opcional)
        </label>
        {selectedPartner ? (
          <div className="mt-1 flex items-center justify-between rounded border bg-muted px-3 py-2">
            <span className="text-sm">
              {selectedPartner.label}
              <span className="ml-2 text-xs text-muted-foreground">
                {ROLE_LABEL[selectedPartner.role] ?? selectedPartner.role}
              </span>
            </span>
            <button type="button" className="text-xs underline"
              onClick={() => { setSelectedPartner(null); setPartnerQuery(""); setPartnerResults([]); }}>
              trocar
            </button>
          </div>
        ) : (
          <>
            <input id="partnerQuery" value={partnerQuery}
              onChange={(e) => runSearch(e.target.value)}
              placeholder="Buscar por nome ou email do parceiro"
              className="mt-1 w-full rounded border px-3 py-2" />
            {searching && <p className="mt-1 text-xs text-muted-foreground">Buscando...</p>}
            {partnerResults.length > 0 && (
              <ul className="mt-1 max-h-48 overflow-auto rounded border">
                {partnerResults.map((p) => (
                  <li key={p.partnerId}>
                    <button type="button"
                      className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-muted"
                      onClick={() => { setSelectedPartner(p); setPartnerResults([]); }}>
                      <span>{p.label}</span>
                      <span className="text-xs text-muted-foreground">
                        {ROLE_LABEL[p.role] ?? p.role}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {partnerQuery.trim().length >= 2 && !searching && partnerResults.length === 0 && (
              <p className="mt-1 text-xs text-muted-foreground">Nenhum parceiro ativo encontrado.</p>
            )}
          </>
        )}
      </div>

      <button type="submit" disabled={pending}
        className="rounded-lg bg-primary px-4 py-2 font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50">
        {pending ? "Criando..." : "Cadastrar cliente"}
      </button>

      {message && (
        <p className={message.kind === "ok" ? "text-sm text-green-700" : "text-sm text-destructive"}>
          {message.text}
        </p>
      )}
    </form>
  );
}
