import { NextResponse } from "next/server";
import { getCallerClaims, getCallerJwt } from "@/lib/auth";
import {
  listAuditEvents,
  resolveProfilesByIds,
  searchUserIdsByEmail,
  type AuditLogEntry,
} from "@/lib/data";
import { parseAuditUrlParams } from "@/lib/audit-url-params";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Hard cap so a runaway export does not pin the container or build a
// 1GB string in memory. 50k rows at ~500 bytes/row ≈ 25MB CSV.
const MAX_ROWS = 50_000;

// CSV column order. Matches the audit table view + adds metadata as JSON
// so operators can post-process in Excel/jq without a separate query.
const HEADER = [
  "id",
  "created_at",
  "event_type",
  "actor_user_id",
  "actor_email",
  "target_user_id",
  "target_email",
  "app_slug",
  "org_id",
  "ip_address",
  "user_agent",
  "metadata",
];

function csvEscape(v: unknown): string {
  if (v === null || v === undefined) return "";
  const s = typeof v === "string" ? v : JSON.stringify(v);
  if (s === "") return "";
  // RFC 4180: quote if contains comma, quote, or newline. Double internal quotes.
  if (/[",\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function rowToCsv(r: AuditLogEntry, emails: Map<string, string>): string {
  return [
    r.id,
    r.created_at,
    r.event_type,
    r.actor_user_id ?? "",
    r.actor_user_id ? (emails.get(r.actor_user_id) ?? "") : "",
    r.target_user_id ?? "",
    r.target_user_id ? (emails.get(r.target_user_id) ?? "") : "",
    r.app_slug ?? "",
    r.org_id ?? "",
    r.ip_address ?? "",
    r.user_agent ?? "",
    r.metadata,
  ].map(csvEscape).join(",");
}

export async function GET(req: Request) {
  const claims = await getCallerClaims();
  if (!claims?.super_admin) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const jwt = await getCallerJwt();
  if (!jwt) {
    return NextResponse.json({ error: "no_session" }, { status: 401 });
  }

  // Reuse the audit page's URL parsing so the export honors EXACTLY the
  // filters the operator already configured in the UI.
  const url = new URL(req.url);
  const sp: Record<string, string | string[] | undefined> = {};
  for (const [k, v] of url.searchParams.entries()) sp[k] = v;
  const parsed = parseAuditUrlParams(sp);

  // Resolve actor/target email queries to id sets the same way page.tsx does.
  let actorIds: string[] | undefined;
  if (parsed.actor_id) actorIds = [parsed.actor_id];
  else if (parsed.actor) {
    const r = await searchUserIdsByEmail({ callerJwt: jwt, query: parsed.actor });
    actorIds = "error" in r ? [] : r.ids;
  }

  let targetIds: string[] | undefined;
  if (parsed.target_id) targetIds = [parsed.target_id];
  else if (parsed.target) {
    const r = await searchUserIdsByEmail({ callerJwt: jwt, query: parsed.target });
    targetIds = "error" in r ? [] : r.ids;
  }

  const lines: string[] = [HEADER.join(",")];
  let cursor = parsed.cursor;
  let total = 0;
  let truncated = false;

  while (total < MAX_ROWS) {
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
      cursor,
    });

    if (result.rows.length === 0) break;

    // Resolve any user_ids in this batch to emails for readable CSV.
    const idsInBatch = new Set<string>();
    for (const r of result.rows) {
      if (r.actor_user_id) idsInBatch.add(r.actor_user_id);
      if (r.target_user_id) idsInBatch.add(r.target_user_id);
    }
    const profileMap = idsInBatch.size > 0
      ? await resolveProfilesByIds({ callerJwt: jwt, ids: [...idsInBatch] })
      : new Map();
    const emails = new Map<string, string>();
    for (const [id, p] of profileMap.entries()) emails.set(id, p.email);

    for (const r of result.rows) {
      if (total >= MAX_ROWS) {
        truncated = true;
        break;
      }
      lines.push(rowToCsv(r, emails));
      total++;
    }

    if (!result.nextCursor) break;
    // listAuditEvents.nextCursor is base64-encoded; we need the decoded form
    // for the next iteration. Decoding here keeps the loop simple.
    const decoded = result.nextCursor;
    if (typeof decoded === "string") {
      // result.nextCursor type is string when present
      const { decodeCursor } = await import("@/lib/audit-cursor");
      cursor = decodeCursor(decoded);
    } else {
      cursor = decoded;
    }
    if (!cursor) break;
  }

  const csv = lines.join("\n") + "\n";
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const fname = `audit-log-${stamp}.csv`;

  console.info(JSON.stringify({
    level: "info", event: "audit_export", actor: claims.sub,
    rows: total, truncated, filters: {
      event_type: parsed.event_type, app_slug: parsed.app_slug,
      from: parsed.from, to: parsed.to,
      actor: parsed.actor ?? parsed.actor_id,
      target: parsed.target ?? parsed.target_id,
    },
  }));

  return new Response(csv, {
    status: 200,
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${fname}"`,
      "x-rows-exported": String(total),
      "x-truncated": String(truncated),
    },
  });
}
