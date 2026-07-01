"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { groupedAuditEvents } from "@/lib/audit-events";
import { serializeAuditUrlParams, type AuditFilterValues } from "@/lib/audit-url-params";
import { Button, buttonClasses } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

export type AuditFiltersProps = {
  apps: Array<{ slug: string; name: string }>;
  initial: Partial<AuditFilterValues>;
};

export function AuditFilters({ apps, initial }: AuditFiltersProps) {
  const router = useRouter();
  const grouped = useMemo(() => groupedAuditEvents(), []);
  const [eventType, setEventType] = useState(initial.event_type ?? "");
  const [appSlug, setAppSlug] = useState(initial.app_slug ?? "");
  const [actor, setActor] = useState(initial.actor ?? "");
  const [target, setTarget] = useState(initial.target ?? "");
  const [from, setFrom] = useState(initial.from ?? "");
  const [to, setTo] = useState(initial.to ?? "");
  const [showCustom, setShowCustom] = useState(Boolean(initial.from || initial.to));

  const dateInvalid = from && to && from > to;

  function navigate(filters: Partial<AuditFilterValues>) {
    const qs = serializeAuditUrlParams(filters);
    router.push(qs ? `/audit?${qs}` : "/audit");
  }

  function applyPreset(preset: "today" | "7d" | "30d") {
    const now = new Date();
    let presetFrom: string;
    if (preset === "today") {
      const start = new Date(now);
      start.setHours(0, 0, 0, 0);
      presetFrom = start.toISOString();
    } else if (preset === "7d") {
      presetFrom = new Date(now.getTime() - 7 * 86400_000).toISOString();
    } else {
      presetFrom = new Date(now.getTime() - 30 * 86400_000).toISOString();
    }
    setFrom(presetFrom);
    setTo("");
    setShowCustom(false);
    navigate({
      event_type: eventType || undefined,
      app_slug: appSlug || undefined,
      actor: actor || undefined,
      target: target || undefined,
      from: presetFrom,
      to: undefined,
    });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (dateInvalid) return;
    navigate({
      event_type: eventType || undefined,
      app_slug: appSlug || undefined,
      actor: actor || undefined,
      target: target || undefined,
      from: from || undefined,
      to: to || undefined,
    });
  }

  function handleClear() {
    setEventType("");
    setAppSlug("");
    setActor("");
    setTarget("");
    setFrom("");
    setTo("");
    setShowCustom(false);
    router.push("/audit");
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-3 rounded-lg border border-border bg-card p-4"
    >
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <label className="block text-sm">
            <span className="mb-1 block text-muted-foreground">Evento</span>
            <Select
              aria-label="Evento"
              value={eventType}
              onChange={(e) => setEventType(e.target.value)}
            >
              <option value="">Todos</option>
              {Object.entries(grouped).map(([groupName, entries]) =>
                entries.length > 0 ? (
                  <optgroup key={groupName} label={groupName}>
                    {entries.map((e) => (
                      <option key={e.value} value={e.value}>{e.label}</option>
                    ))}
                  </optgroup>
                ) : null,
              )}
            </Select>
          </label>

          <label className="block text-sm">
            <span className="mb-1 block text-muted-foreground">App</span>
            <Select
              aria-label="App"
              value={appSlug}
              onChange={(e) => setAppSlug(e.target.value)}
            >
              <option value="">Todos</option>
              {apps.map((a) => (
                <option key={a.slug} value={a.slug}>{a.name}</option>
              ))}
            </Select>
          </label>

          <div className="block text-sm">
            <span className="mb-1 block text-muted-foreground">Período</span>
            <div className="flex flex-wrap gap-1">
              <Button type="button" variant="outline" size="sm" onClick={() => applyPreset("today")}>
                Hoje
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => applyPreset("7d")}>
                7 dias
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => applyPreset("30d")}>
                30 dias
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => setShowCustom((v) => !v)}>
                Custom
              </Button>
            </div>
          </div>
        </div>

        {showCustom && (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <label className="block text-sm">
              <span className="mb-1 block text-muted-foreground">De</span>
              <Input
                type="datetime-local"
                aria-label="De"
                value={from.slice(0, 16)}
                onChange={(e) => setFrom(e.target.value ? new Date(e.target.value).toISOString() : "")}
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-muted-foreground">Até</span>
              <Input
                type="datetime-local"
                aria-label="Até"
                value={to.slice(0, 16)}
                onChange={(e) => setTo(e.target.value ? new Date(e.target.value).toISOString() : "")}
              />
            </label>
          </div>
        )}

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <label className="block text-sm">
            <span className="mb-1 block text-muted-foreground">Ator (email)</span>
            <Input
              type="text"
              aria-label="Ator (email)"
              value={actor}
              onChange={(e) => setActor(e.target.value)}
              placeholder="busca por email, min 3 chars"
            />
          </label>

          <label className="block text-sm">
            <span className="mb-1 block text-muted-foreground">Alvo (email)</span>
            <Input
              type="text"
              aria-label="Alvo (email)"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              placeholder="busca por email, min 3 chars"
            />
          </label>
        </div>

        <div className="flex items-center justify-between gap-2">
          {dateInvalid ? (
            <span className="text-xs text-destructive">Data inicial deve ser anterior a final.</span>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <a
              href={`/api/audit/export?${serializeAuditUrlParams({
                event_type: eventType || undefined,
                app_slug: appSlug || undefined,
                actor: actor || undefined,
                target: target || undefined,
                from: from || undefined,
                to: to || undefined,
              })}`}
              className={buttonClasses({ variant: "outline", size: "md" })}
              title="Baixa CSV com os filtros atuais (cap 50k linhas)"
            >
              Exportar CSV
            </a>
            <Button type="button" variant="outline" onClick={handleClear}>
              Limpar
            </Button>
            <Button type="submit" disabled={Boolean(dateInvalid)}>
              Aplicar
            </Button>
          </div>
        </div>
    </form>
  );
}
