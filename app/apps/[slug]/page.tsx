import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminShell } from "@/components/AdminShell";
import { AppForm } from "@/components/AppForm";
import { AppFlagToggle } from "@/components/AppFlagToggle";
import { TabNav, type TabItem } from "@/components/Tabs";
import { CasePredictorOrdersTab } from "./_components/CasePredictorOrdersTab";
import { CasePredictorCouponsTab } from "./_components/CasePredictorCouponsTab";
import { getCallerJwt } from "@/lib/auth";
import { getApp } from "@/lib/data";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  active: "Ativo",
  beta: "Beta",
  sunset: "Em descontinuação",
  archived: "Arquivado",
};

const CASE_PREDICTOR_TABS: TabItem[] = [
  { key: "overview", label: "Visão geral" },
  { key: "orders", label: "Orders" },
  { key: "coupons", label: "Coupons" },
];

const CASE_PREDICTOR_VALID_TABS = ["overview", "orders", "coupons"] as const;
type CasePredictorTab = (typeof CASE_PREDICTOR_VALID_TABS)[number];

function resolveCasePredictorTab(raw: string | string[] | undefined): CasePredictorTab {
  const v = Array.isArray(raw) ? raw[0] : raw;
  return (CASE_PREDICTOR_VALID_TABS as readonly string[]).includes(v ?? "")
    ? (v as CasePredictorTab)
    : "overview";
}

export default async function AppDetailPage(props: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ tab?: string | string[] }>;
}) {
  const { slug } = await props.params;
  const { tab: tabParam } = await props.searchParams;
  const jwt = await getCallerJwt();
  if (!jwt) {
    return (
      <AdminShell>
        <p className="text-destructive">Sessão inválida. Faça login novamente.</p>
      </AdminShell>
    );
  }

  const app = await getApp({ callerJwt: jwt, slug });
  if (!app) notFound();

  const isCasePredictor = app.slug === "case-predictor";
  const activeCpTab = isCasePredictor ? resolveCasePredictorTab(tabParam) : "overview";

  return (
    <AdminShell>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <Link href="/apps" className="text-sm text-muted-foreground hover:underline">
            &larr; Apps
          </Link>
          <h1 className="text-2xl font-semibold mt-1">{app.name}</h1>
          <p className="text-xs text-muted-foreground font-mono">{app.slug}</p>
        </div>
        <span className="rounded-full border border-border bg-muted px-3 py-1 text-xs">
          {STATUS_LABEL[app.status] ?? app.status}
        </span>
      </div>

      {isCasePredictor && <TabNav items={CASE_PREDICTOR_TABS} active={activeCpTab} />}

      {(!isCasePredictor || activeCpTab === "overview") && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <section className="lg:col-span-2 rounded-2xl border border-border bg-card p-6">
            <h2 className="text-base font-semibold mb-4">Informações</h2>
            <AppForm mode="edit" initial={app} />
          </section>

          <aside className="space-y-6">
            <section className="rounded-2xl border border-border bg-card p-6">
              <h2 className="text-base font-semibold mb-2">Disponibilidade</h2>
              <div className="divide-y divide-border">
                <AppFlagToggle
                  slug={app.slug}
                  flag="accepts_new_subscriptions"
                  current={app.accepts_new_subscriptions}
                  label="Aceita novos contratantes"
                  description="Bloqueia novas assinaturas; quem já tem continua funcionando."
                />
                <AppFlagToggle
                  slug={app.slug}
                  flag="active"
                  current={app.active}
                  label="Ativo"
                  description="Bloqueia tudo. Use para sunset definitivo. Usuários atuais perdem acesso na próxima rotação de token."
                />
              </div>
            </section>

            <section className="rounded-2xl border border-border bg-card p-6">
              <h2 className="text-base font-semibold mb-2">Metadados</h2>
              <dl className="space-y-2 text-sm">
                <div>
                  <dt className="text-muted-foreground text-xs">Criado em</dt>
                  <dd>{new Date(app.created_at).toLocaleString("pt-BR")}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground text-xs">Atualizado em</dt>
                  <dd>{new Date(app.updated_at).toLocaleString("pt-BR")}</dd>
                </div>
                {app.public_url && (
                  <div>
                    <dt className="text-muted-foreground text-xs">URL pública</dt>
                    <dd>
                      <a
                        href={app.public_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-foreground hover:underline break-all"
                      >
                        {app.public_url}
                      </a>
                    </dd>
                  </div>
                )}
              </dl>
            </section>

            {Object.keys(app.role_catalog ?? {}).length > 0 && (
              <section className="rounded-2xl border border-border bg-card p-6">
                <h2 className="text-base font-semibold mb-2">Catálogo de papéis</h2>
                <p className="text-xs text-muted-foreground mb-3">
                  Documentação dos papéis internos do app. JWT carrega só `tenant-admin` ou `member`.
                </p>
                <ul className="space-y-1 text-sm">
                  {Object.entries(app.role_catalog as Record<string, string>).map(([key, label]) => (
                    <li key={key}>
                      <span className="font-mono text-xs text-muted-foreground">{key}</span>{" "}
                      <span>{label}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </aside>
        </div>
      )}

      {isCasePredictor && activeCpTab === "orders" && <CasePredictorOrdersTab />}
      {isCasePredictor && activeCpTab === "coupons" && <CasePredictorCouponsTab />}
    </AdminShell>
  );
}
