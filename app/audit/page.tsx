import { AdminShell } from "@/components/AdminShell";
import { AuditFilters } from "@/components/AuditFilters";
import { AuditTable } from "@/components/AuditTable";
import { AuditPagination } from "@/components/AuditPagination";
import { getCallerJwt } from "@/lib/auth";
import {
  listAuditEvents,
  listApps,
  resolveProfilesByIds,
  searchUserIdsByEmail,
  type AuditLogEntry,
} from "@/lib/data";
import { parseAuditUrlParams } from "@/lib/audit-url-params";

export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;

export default async function AuditPage(props: { searchParams: Promise<SearchParams> }) {
  const sp = await props.searchParams;
  const parsed = parseAuditUrlParams(sp);

  const jwt = await getCallerJwt();
  if (!jwt) {
    return (
      <AdminShell>
        <p className="text-destructive">Sessão inválida. Faça login novamente.</p>
      </AdminShell>
    );
  }

  let apps: Array<{ slug: string; name: string }> = [];
  let rows: AuditLogEntry[] = [];
  let nextCursor: string | null = null;
  let profileMap = new Map<string, { email: string }>();
  let pageError: string | null = null;
  let actorWarning: "not_found" | "truncated" | "validation" | null = null;
  let targetWarning: "not_found" | "truncated" | "validation" | null = null;
  let resolvedActorEmail: string | null = null;
  let resolvedTargetEmail: string | null = null;

  try {
    apps = await listApps({ callerJwt: jwt });

    let actorIds: string[] | undefined;
    if (parsed.actor_id) {
      actorIds = [parsed.actor_id];
      const m = await resolveProfilesByIds({ callerJwt: jwt, ids: [parsed.actor_id] });
      resolvedActorEmail = m.get(parsed.actor_id)?.email ?? null;
    } else if (parsed.actor) {
      const r = await searchUserIdsByEmail({ callerJwt: jwt, query: parsed.actor });
      if ("error" in r) {
        actorWarning = "validation";
        actorIds = [];
      } else {
        actorIds = r.ids;
        if (r.ids.length === 0) actorWarning = "not_found";
        else if (r.truncated) actorWarning = "truncated";
      }
    }

    let targetIds: string[] | undefined;
    if (parsed.target_id) {
      targetIds = [parsed.target_id];
      const m = await resolveProfilesByIds({ callerJwt: jwt, ids: [parsed.target_id] });
      resolvedTargetEmail = m.get(parsed.target_id)?.email ?? null;
    } else if (parsed.target) {
      const r = await searchUserIdsByEmail({ callerJwt: jwt, query: parsed.target });
      if ("error" in r) {
        targetWarning = "validation";
        targetIds = [];
      } else {
        targetIds = r.ids;
        if (r.ids.length === 0) targetWarning = "not_found";
        else if (r.truncated) targetWarning = "truncated";
      }
    }

    const result = await listAuditEvents({
      callerJwt: jwt,
      filters: {
        event_type: parsed.event_type,
        app_slug: parsed.app_slug,
        from: parsed.from,
        to: parsed.to,
      },
      actorIds,
      targetIds,
      cursor: parsed.cursor,
    });
    rows = result.rows;
    nextCursor = result.nextCursor;

    const displayedIds = new Set<string>();
    for (const r of rows) {
      if (r.actor_user_id) displayedIds.add(r.actor_user_id);
      if (r.target_user_id) displayedIds.add(r.target_user_id);
    }
    if (displayedIds.size > 0) {
      profileMap = await resolveProfilesByIds({ callerJwt: jwt, ids: Array.from(displayedIds) });
    }
  } catch (e) {
    pageError = (e as Error).message;
  }

  return (
    <AdminShell>
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-display font-semibold text-2xl">Auditoria</h1>
          <p className="text-sm text-muted-foreground">
            Log global de eventos do painel.
          </p>
        </div>
        <form action="/audit" method="get">
          {Object.entries(sp).map(([k, v]) =>
            typeof v === "string" && v.length > 0 ? (
              <input key={k} type="hidden" name={k} value={v} />
            ) : null,
          )}
          <button
            type="submit"
            className="rounded-lg border border-border bg-card px-3 py-2 text-sm hover:bg-muted"
          >
            ↻ Atualizar
          </button>
        </form>
      </header>

      <div className="space-y-4">
        <AuditFilters
          apps={apps}
          initial={{
            event_type: parsed.event_type,
            app_slug: parsed.app_slug,
            actor: parsed.actor,
            target: parsed.target,
            from: parsed.from,
            to: parsed.to,
          }}
        />

        {(parsed.actor_id || parsed.target_id) && (
          <DeeplinkBadge
            actorId={parsed.actor_id}
            targetId={parsed.target_id}
            actorEmail={resolvedActorEmail}
            targetEmail={resolvedTargetEmail}
            currentSp={sp}
          />
        )}

        {actorWarning && <UserSearchWarning kind={actorWarning} field="ator" query={parsed.actor ?? ""} />}
        {targetWarning && <UserSearchWarning kind={targetWarning} field="alvo" query={parsed.target ?? ""} />}

        {pageError ? (
          <div className="rounded-2xl border border-destructive bg-destructive/5 p-6">
            <p className="text-destructive font-medium">Erro ao carregar auditoria.</p>
            <p className="text-sm text-muted-foreground mt-1 font-mono">{pageError}</p>
          </div>
        ) : (
          <>
            <AuditTable rows={rows} profileMap={profileMap} />
            <AuditPagination
              currentParams={{
                event_type: parsed.event_type,
                app_slug: parsed.app_slug,
                actor: parsed.actor,
                actor_id: parsed.actor_id,
                target: parsed.target,
                target_id: parsed.target_id,
                from: parsed.from,
                to: parsed.to,
              }}
              nextCursor={nextCursor}
            />
          </>
        )}
      </div>
    </AdminShell>
  );
}

function DeeplinkBadge(props: {
  actorId?: string;
  targetId?: string;
  actorEmail: string | null;
  targetEmail: string | null;
  currentSp: SearchParams;
}) {
  const isActor = Boolean(props.actorId);
  const id = (isActor ? props.actorId : props.targetId) ?? "";
  const email = isActor ? props.actorEmail : props.targetEmail;
  const label = isActor ? "Filtrando ator" : "Filtrando alvo";

  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(props.currentSp)) {
    if (typeof v === "string" && v.length > 0 && k !== "actor_id" && k !== "target_id" && k !== "after") {
      params.set(k, v);
    }
  }
  const removeHref = params.toString() ? `/audit?${params.toString()}` : "/audit";

  return (
    <div className="rounded-lg bg-muted/40 border border-border px-3 py-2 text-sm flex items-center justify-between">
      <span>
        {label} = <strong>{email ?? id}</strong>{" "}
        <span className="text-xs text-muted-foreground font-mono">({id.slice(0, 8)}…)</span>
      </span>
      <a href={removeHref} className="text-xs text-muted-foreground hover:text-foreground" aria-label="Limpar filtro deeplink">
        ✕ limpar
      </a>
    </div>
  );
}

function UserSearchWarning(props: {
  kind: "not_found" | "truncated" | "validation";
  field: "ator" | "alvo";
  query: string;
}) {
  if (props.kind === "validation") {
    return (
      <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-sm text-amber-900">
        Busca de {props.field} precisa de no mínimo 3 caracteres.
      </div>
    );
  }
  if (props.kind === "not_found") {
    return (
      <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-sm text-amber-900">
        Nenhum usuário encontrado para o {props.field} &apos;{props.query}&apos;. Verifique a busca.
      </div>
    );
  }
  return (
    <div className="rounded-lg bg-blue-50 border border-blue-200 px-3 py-2 text-sm text-blue-900">
      Mostrando até 50 usuários correspondentes ao {props.field} &apos;{props.query}&apos;. Refine a busca para resultados mais precisos.
    </div>
  );
}
