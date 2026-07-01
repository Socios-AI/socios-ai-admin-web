"use client";

import { useState, useTransition, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Copy, Check } from "lucide-react";
import { createOrgWithIntroducerAction } from "@/app/_actions/create-org-with-introducer";
import { searchPartnersAction, type PartnerSearchRow } from "@/app/_actions/search-partners";
import { Card } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { copyToClipboard } from "@/lib/ui/clipboard";

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
  const router = useRouter();
  const [appSlug, setAppSlug] = useState(apps[0]?.slug ?? "");
  const [tenantName, setTenantName] = useState("");
  const [adminName, setAdminName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [niche, setNiche] = useState("");

  const [partnerQuery, setPartnerQuery] = useState("");
  const [partnerResults, setPartnerResults] = useState<PartnerSearchRow[]>([]);
  const [selectedPartner, setSelectedPartner] = useState<PartnerSearchRow | null>(null);
  const [searching, setSearching] = useState(false);

  const searchSeq = useRef(0);

  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ inviteUrl: string; emailSent: boolean } | null>(null);
  const [copied, setCopied] = useState(false);

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
    setError(null);
    setResult(null);
    startTransition(async () => {
      const res = await createOrgWithIntroducerAction({
        appSlug,
        tenantName,
        adminName,
        adminEmail,
        niche: requiresNiche ? niche : undefined,
        introducedByPartnerId: selectedPartner?.partnerId,
      });
      if (res.ok) {
        const who = res.tenant.introducedByPartnerId ? " (indicante registrado)" : "";
        toast.success(`Cliente "${res.tenant.tenantName}" criado${who}.`);
        setResult({ inviteUrl: res.tenant.inviteUrl, emailSent: res.tenant.emailSent });
      } else {
        setError(res.message ?? res.error);
      }
    });
  }

  return (
    <Card className="max-w-xl p-6">
      <form onSubmit={onSubmit} className="space-y-4">
        <Field label="App" htmlFor="appSlug" required>
          <Select
            id="appSlug"
            value={appSlug}
            onChange={(e) => setAppSlug(e.target.value)}
            required
          >
            {apps.map((a) => (
              <option key={a.slug} value={a.slug}>{a.name}</option>
            ))}
          </Select>
        </Field>

        <Field label="Nome do cliente" htmlFor="tenantName" required>
          <Input
            id="tenantName"
            value={tenantName}
            onChange={(e) => setTenantName(e.target.value)}
            minLength={2}
            maxLength={100}
            required
          />
        </Field>

        <Field label="Nome do responsável" htmlFor="adminName" required>
          <Input
            id="adminName"
            value={adminName}
            onChange={(e) => setAdminName(e.target.value)}
            minLength={2}
            maxLength={100}
            placeholder="Nome completo de quem vai administrar"
            required
          />
        </Field>

        <Field label="Email do responsável" htmlFor="adminEmail" required>
          <Input
            id="adminEmail"
            type="email"
            value={adminEmail}
            onChange={(e) => setAdminEmail(e.target.value)}
            required
          />
        </Field>

        {requiresNiche && (
          <Field label="Nicho" htmlFor="niche" required>
            <Select id="niche" value={niche} onChange={(e) => setNiche(e.target.value)} required>
              <option value="">Selecione...</option>
              {Object.entries(nicheCatalog!).map(([slug, label]) => (
                <option key={slug} value={slug}>{label}</option>
              ))}
            </Select>
          </Field>
        )}

        <Field label="Indicado por (opcional)" htmlFor="partnerQuery">
          {selectedPartner ? (
            <div className="flex items-center justify-between rounded-md border border-border bg-muted px-3 py-2">
              <span className="text-sm">
                {selectedPartner.label}
                <span className="ml-2 text-xs text-muted-foreground">
                  {ROLE_LABEL[selectedPartner.role] ?? selectedPartner.role}
                </span>
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => { setSelectedPartner(null); setPartnerQuery(""); setPartnerResults([]); }}
              >
                trocar
              </Button>
            </div>
          ) : (
            <>
              <Input
                id="partnerQuery"
                value={partnerQuery}
                onChange={(e) => runSearch(e.target.value)}
                placeholder="Buscar por nome ou email do parceiro"
              />
              {searching && <p className="mt-1 text-xs text-muted-foreground">Buscando...</p>}
              {partnerResults.length > 0 && (
                <ul className="mt-1 max-h-48 overflow-auto rounded-md border border-border">
                  {partnerResults.map((p) => (
                    <li key={p.partnerId}>
                      <button
                        type="button"
                        className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-muted"
                        onClick={() => { setSelectedPartner(p); setPartnerResults([]); }}
                      >
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
        </Field>

        <Button type="submit" loading={pending}>
          {pending ? "Criando..." : "Cadastrar cliente"}
        </Button>

        {error ? (
          <p className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </p>
        ) : null}

        {result ? (
          <div className="space-y-2 rounded-md border border-primary/40 bg-primary/10 p-3 text-sm">
            <div className="flex items-center gap-2">
              <span className="font-medium">Cliente criado!</span>
              <Badge variant={result.emailSent ? "success" : "muted"}>
                {result.emailSent ? "Convite enviado" : "Convite gerado"}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">Link do convite:</p>
            <div className="flex items-center gap-2">
              <code className="min-w-0 flex-1 truncate rounded-md bg-background px-2 py-1.5 font-mono text-xs">
                {result.inviteUrl}
              </code>
              <Button
                type="button"
                variant="outline"
                size="icon"
                aria-label="Copiar link"
                onClick={async () => {
                  const ok = await copyToClipboard(result.inviteUrl, "Link copiado");
                  if (ok) {
                    setCopied(true);
                    setTimeout(() => setCopied(false), 1500);
                  }
                }}
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setResult(null);
                setTenantName("");
                setAdminName("");
                setAdminEmail("");
                setNiche("");
                setSelectedPartner(null);
                setPartnerQuery("");
                router.refresh();
              }}
            >
              Cadastrar outro
            </Button>
          </div>
        ) : null}
      </form>
    </Card>
  );
}
