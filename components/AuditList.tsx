import type { AuditEvent } from "@/lib/data";

export function AuditList({ events }: { events: AuditEvent[] }) {
  if (events.length === 0) {
    return <p className="text-sm text-muted-foreground">Sem eventos recentes.</p>;
  }
  return (
    <ul className="space-y-2">
      {events.map((e) => (
        <li key={e.id} className="text-sm border-l-2 border-border pl-3 py-1">
          <p className="font-mono text-xs text-muted-foreground">
            {new Date(e.created_at).toLocaleString("pt-BR")}
          </p>
          <p>
            <span className="font-medium">{e.event_type}</span>
            {e.metadata && Object.keys(e.metadata).length > 0 && (
              <span className="text-muted-foreground"> · {JSON.stringify(e.metadata)}</span>
            )}
          </p>
        </li>
      ))}
    </ul>
  );
}
