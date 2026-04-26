import { decodeCursor, encodeCursor, type AuditCursor } from "./audit-cursor";

export type AuditUrlParams = {
  event_type: string | undefined;
  app_slug: string | undefined;
  from: string | undefined;
  to: string | undefined;
  actor: string | undefined;
  actor_id: string | undefined;
  target: string | undefined;
  target_id: string | undefined;
  cursor: AuditCursor | null;
};

export type AuditFilterValues = Omit<AuditUrlParams, "cursor">;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function readString(sp: Record<string, string | string[] | undefined>, key: string): string | undefined {
  const v = sp[key];
  if (typeof v !== "string") return undefined;
  const trimmed = v.trim();
  return trimmed.length === 0 ? undefined : trimmed;
}

function readUuid(sp: Record<string, string | string[] | undefined>, key: string): string | undefined {
  const v = readString(sp, key);
  if (!v) return undefined;
  return UUID_RE.test(v) ? v : undefined;
}

export function parseAuditUrlParams(sp: Record<string, string | string[] | undefined>): AuditUrlParams {
  return {
    event_type: readString(sp, "event_type"),
    app_slug: readString(sp, "app_slug"),
    from: readString(sp, "from"),
    to: readString(sp, "to"),
    actor: readString(sp, "actor"),
    actor_id: readUuid(sp, "actor_id"),
    target: readString(sp, "target"),
    target_id: readUuid(sp, "target_id"),
    cursor: decodeCursor(readString(sp, "after")),
  };
}

export function serializeAuditUrlParams(
  filters: Partial<AuditFilterValues>,
  cursor?: AuditCursor | null,
): string {
  const params = new URLSearchParams();
  const keys: Array<keyof AuditFilterValues> = [
    "event_type", "app_slug", "from", "to", "actor", "actor_id", "target", "target_id",
  ];
  for (const k of keys) {
    const v = filters[k];
    if (typeof v === "string" && v.length > 0) {
      params.set(k, v);
    }
  }
  if (cursor) {
    params.set("after", encodeCursor(cursor));
  }
  return params.toString();
}
