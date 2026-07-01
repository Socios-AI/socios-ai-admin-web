"use client";

import * as React from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { buttonClasses } from "@/components/ui/button";
import type { AuditLogEntry } from "@/lib/data";

export type AuditTableProps = {
  rows: AuditLogEntry[];
  profileMap: Map<string, { email: string }>;
  filtersApplied?: boolean;
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

export function AuditTable({ rows, profileMap, filtersApplied }: AuditTableProps) {
  const [expanded, setExpanded] = React.useState<Set<AuditLogEntry["id"]>>(new Set());

  if (rows.length === 0) {
    return filtersApplied ? (
      <EmptyState
        title="Nenhum evento encontrado para os filtros atuais."
        action={
          <a href="/audit" className={buttonClasses({ variant: "outline", size: "sm" })}>
            Limpar filtros
          </a>
        }
      />
    ) : (
      <EmptyState title="Nenhum evento registrado ainda." />
    );
  }

  function toggle(id: AuditLogEntry["id"]) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <Table>
      <THead>
        <TR>
          <TH>Quando</TH>
          <TH>Evento</TH>
          <TH>Ator</TH>
          <TH>Alvo</TH>
          <TH>App</TH>
        </TR>
      </THead>
      <TBody>
        {rows.map((r) => {
          const isOpen = expanded.has(r.id);
          return (
            <React.Fragment key={r.id}>
              <TR>
                <TD className="whitespace-nowrap">
                  <button
                    type="button"
                    onClick={() => toggle(r.id)}
                    aria-expanded={isOpen}
                    aria-label={isOpen ? "Recolher detalhes" : "Expandir detalhes"}
                    className="inline-flex items-center gap-2 text-left transition-colors hover:text-foreground"
                  >
                    {isOpen ? (
                      <ChevronDown className="h-3 w-3 shrink-0" aria-hidden="true" />
                    ) : (
                      <ChevronRight className="h-3 w-3 shrink-0" aria-hidden="true" />
                    )}
                    <span className="font-mono text-xs text-muted-foreground">
                      {formatWhen(r.created_at)}
                    </span>
                  </button>
                </TD>
                <TD className="font-medium">{r.event_type}</TD>
                <TD className="truncate text-muted-foreground">
                  {renderUserCell(r.actor_user_id, profileMap)}
                </TD>
                <TD className="truncate text-muted-foreground">
                  {renderUserCell(r.target_user_id, profileMap)}
                </TD>
                <TD className="text-muted-foreground">{r.app_slug ?? "·"}</TD>
              </TR>
              {isOpen ? (
                <TR>
                  <TD colSpan={5} className="bg-muted/20">
                    <div className="space-y-2">
                      <div className="space-x-3 text-xs text-muted-foreground">
                        {r.app_slug && <span>App: {r.app_slug}</span>}
                        {r.org_id && <span>Org: {r.org_id}</span>}
                        {r.ip_address && (
                          <span>
                            IP: <span>{r.ip_address}</span>
                          </span>
                        )}
                      </div>
                      {r.user_agent && (
                        <div className="text-xs text-muted-foreground">
                          User-Agent: <span className="font-mono">{r.user_agent}</span>
                        </div>
                      )}
                      <pre className="overflow-x-auto rounded border border-border bg-background p-3 font-mono text-xs">
                        {JSON.stringify(r.metadata ?? {}, null, 2)}
                      </pre>
                    </div>
                  </TD>
                </TR>
              ) : null}
            </React.Fragment>
          );
        })}
      </TBody>
    </Table>
  );
}
