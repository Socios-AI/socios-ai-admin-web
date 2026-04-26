import type { AuditLogEntry } from "@/lib/data";

export type AuditTableProps = {
  rows: AuditLogEntry[];
  profileMap: Map<string, { email: string }>;
};

function truncateUuid(id: string): string {
  return `${id.slice(0, 8)}…`;
}

function renderUserCell(id: string | null, profileMap: Map<string, { email: string }>): string {
  if (!id) return "·";
  const profile = profileMap.get(id);
  return profile ? profile.email : truncateUuid(id);
}

function formatWhen(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR");
}

export function AuditTable({ rows, profileMap }: AuditTableProps) {
  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-card p-6 text-center">
        <p className="text-sm text-muted-foreground">Nenhum evento encontrado para os filtros atuais.</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-muted/50">
          <tr>
            <th scope="col" className="text-left px-4 py-2 font-medium text-muted-foreground">Quando</th>
            <th scope="col" className="text-left px-4 py-2 font-medium text-muted-foreground">Evento</th>
            <th scope="col" className="text-left px-4 py-2 font-medium text-muted-foreground">Ator</th>
            <th scope="col" className="text-left px-4 py-2 font-medium text-muted-foreground">Alvo</th>
            <th scope="col" className="text-left px-4 py-2 font-medium text-muted-foreground">App</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map((r) => (
            <tr key={r.id}>
              <td colSpan={5} className="p-0">
                <details className="group">
                  <summary className="grid grid-cols-[180px_1fr_1fr_1fr_140px] items-center gap-2 px-4 py-2 cursor-pointer hover:bg-muted/30">
                    <span className="font-mono text-xs text-muted-foreground">{formatWhen(r.created_at)}</span>
                    <span className="font-medium">{r.event_type}</span>
                    <span className="text-muted-foreground truncate">{renderUserCell(r.actor_user_id, profileMap)}</span>
                    <span className="text-muted-foreground truncate">{renderUserCell(r.target_user_id, profileMap)}</span>
                    <span className="text-muted-foreground">{r.app_slug ?? "·"}</span>
                  </summary>
                  <div className="px-4 py-3 bg-muted/20 border-t border-border space-y-2">
                    <div className="text-xs text-muted-foreground space-x-3">
                      {r.app_slug && <span>App: {r.app_slug}</span>}
                      {r.org_id && <span>Org: {r.org_id}</span>}
                      {r.ip_address && <span>IP: <span>{r.ip_address}</span></span>}
                    </div>
                    {r.user_agent && (
                      <div className="text-xs text-muted-foreground">
                        User-Agent: <span className="font-mono">{r.user_agent}</span>
                      </div>
                    )}
                    <pre className="text-xs font-mono bg-background border border-border rounded p-3 overflow-x-auto">
                      {JSON.stringify(r.metadata ?? {}, null, 2)}
                    </pre>
                  </div>
                </details>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
