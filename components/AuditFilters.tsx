"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { groupedAuditEvents } from "@/lib/audit-events";
import { serializeAuditUrlParams, type AuditFilterValues } from "@/lib/audit-url-params";

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
    <form onSubmit={handleSubmit} className="rounded-2xl border border-border bg-card p-4 space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <label className="block text-sm">
          <span className="block mb-1 text-muted-foreground">Evento</span>
          <select
            aria-label="Evento"
            value={eventType}
            onChange={(e) => setEventType(e.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
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
          </select>
        </label>

        <label className="block text-sm">
          <span className="block mb-1 text-muted-foreground">App</span>
          <select
            aria-label="App"
            value={appSlug}
            onChange={(e) => setAppSlug(e.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="">Todos</option>
            {apps.map((a) => (
              <option key={a.slug} value={a.slug}>{a.name}</option>
            ))}
          </select>
        </label>

        <div className="block text-sm">
          <span className="block mb-1 text-muted-foreground">Periodo</span>
          <div className="flex flex-wrap gap-1">
            <button
              type="button"
              onClick={() => applyPreset("today")}
              className="px-2 py-1 rounded border border-border text-xs hover:bg-muted"
            >
              Hoje
            </button>
            <button
              type="button"
              onClick={() => applyPreset("7d")}
              className="px-2 py-1 rounded border border-border text-xs hover:bg-muted"
            >
              7 dias
            </button>
            <button
              type="button"
              onClick={() => applyPreset("30d")}
              className="px-2 py-1 rounded border border-border text-xs hover:bg-muted"
            >
              30 dias
            </button>
            <button
              type="button"
              onClick={() => setShowCustom((v) => !v)}
              className="px-2 py-1 rounded border border-border text-xs hover:bg-muted"
            >
              Custom
            </button>
          </div>
        </div>
      </div>

      {showCustom && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <label className="block text-sm">
            <span className="block mb-1 text-muted-foreground">De</span>
            <input
              type="datetime-local"
              aria-label="De"
              value={from.slice(0, 16)}
              onChange={(e) => setFrom(e.target.value ? new Date(e.target.value).toISOString() : "")}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </label>
          <label className="block text-sm">
            <span className="block mb-1 text-muted-foreground">Até</span>
            <input
              type="datetime-local"
              aria-label="Até"
              value={to.slice(0, 16)}
              onChange={(e) => setTo(e.target.value ? new Date(e.target.value).toISOString() : "")}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </label>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <label className="block text-sm">
          <span className="block mb-1 text-muted-foreground">Ator (email)</span>
          <input
            type="text"
            aria-label="Ator (email)"
            value={actor}
            onChange={(e) => setActor(e.target.value)}
            placeholder="busca por email, min 3 chars"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
        </label>

        <label className="block text-sm">
          <span className="block mb-1 text-muted-foreground">Alvo (email)</span>
          <input
            type="text"
            aria-label="Alvo (email)"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            placeholder="busca por email, min 3 chars"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
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
          <button
            type="button"
            onClick={handleClear}
            className="rounded-lg border border-border px-3 py-2 text-sm hover:bg-muted"
          >
            Limpar
          </button>
          <button
            type="submit"
            disabled={Boolean(dateInvalid)}
            className="rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:opacity-90 disabled:opacity-50"
          >
            Aplicar
          </button>
        </div>
      </div>
    </form>
  );
}
