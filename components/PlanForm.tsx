"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createPlanAction } from "@/app/_actions/create-plan";
import { updatePlanAction } from "@/app/_actions/update-plan";
import type { PlanDetail } from "@/lib/data";
import type { AppRow } from "@/lib/data";
import {
  featuresObjectToArray,
  type FeatureEntry,
} from "@/lib/validation";

type Mode = "create" | "edit";

export type PlanFormProps = {
  mode: Mode;
  apps: AppRow[];
  initial?: PlanDetail;
};

const PERIOD_OPTIONS: Array<{ value: "monthly" | "yearly" | "one_time" | "custom"; label: string }> = [
  { value: "monthly", label: "Mensal (recurring)" },
  { value: "yearly", label: "Anual (recurring)" },
  { value: "one_time", label: "Único (one-time)" },
  { value: "custom", label: "Custom (sem sync com Stripe)" },
];

const CURRENCY_OPTIONS: Array<{ value: "usd" | "brl" | "eur"; label: string }> = [
  { value: "usd", label: "USD" },
  { value: "brl", label: "BRL" },
  { value: "eur", label: "EUR" },
];

type FeatureValueType = "string" | "number" | "boolean";

type FeatureRow = FeatureEntry & { id: number; valueType: FeatureValueType };

function inferType(value: FeatureEntry["value"]): FeatureValueType {
  if (typeof value === "boolean") return "boolean";
  if (typeof value === "number") return "number";
  return "string";
}

function entriesToRows(entries: FeatureEntry[]): FeatureRow[] {
  return entries.map((entry, index) => ({
    ...entry,
    id: index,
    valueType: inferType(entry.value),
  }));
}

let nextRowId = 1000;

export function PlanForm({ mode, apps, initial }: PlanFormProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "yearly" | "one_time" | "custom">(
    initial?.billing_period ?? "monthly",
  );
  const initialPrice = initial?.price_amount ?? 0;
  const [priceAmount, setPriceAmount] = useState<string>(String(initialPrice));
  const [currency, setCurrency] = useState<"usd" | "brl" | "eur">(initial?.currency ?? "usd");
  const [isVisible, setIsVisible] = useState<boolean>(initial?.is_visible ?? true);
  const [appSlugs, setAppSlugs] = useState<string[]>(initial?.app_slugs ?? []);
  const [features, setFeatures] = useState<FeatureRow[]>(
    entriesToRows(featuresObjectToArray(initial?.features ?? {})),
  );

  const previousPrice = initial?.price_amount;
  const previousPeriod = initial?.billing_period;
  const previousCurrency = initial?.currency;
  const priceWillChange =
    mode === "edit" &&
    !!initial &&
    (Number(priceAmount) !== previousPrice ||
      billingPeriod !== previousPeriod ||
      currency !== previousCurrency);

  const customSelected = billingPeriod === "custom";

  const sortedApps = useMemo(
    () => [...apps].sort((a, b) => a.name.localeCompare(b.name)),
    [apps],
  );

  function toggleApp(slug: string) {
    setAppSlugs((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug],
    );
  }

  function addFeatureRow() {
    setFeatures((prev) => [
      ...prev,
      { id: nextRowId++, key: "", value: "", valueType: "string" },
    ]);
  }

  function removeFeatureRow(id: number) {
    setFeatures((prev) => prev.filter((row) => row.id !== id));
  }

  function updateFeatureRow(id: number, patch: Partial<FeatureRow>) {
    setFeatures((prev) =>
      prev.map((row) => {
        if (row.id !== id) return row;
        const merged = { ...row, ...patch };
        if (patch.valueType && patch.valueType !== row.valueType) {
          if (patch.valueType === "boolean") merged.value = false;
          else if (patch.valueType === "number") merged.value = 0;
          else merged.value = "";
        }
        return merged;
      }),
    );
  }

  function buildFeaturesPayload(): { ok: true; entries: FeatureEntry[] } | { ok: false; message: string } {
    const out: FeatureEntry[] = [];
    for (const row of features) {
      if (!row.key) continue;
      let value: FeatureEntry["value"];
      if (row.valueType === "boolean") {
        value = Boolean(row.value);
      } else if (row.valueType === "number") {
        const n = typeof row.value === "number" ? row.value : Number(row.value);
        if (!Number.isFinite(n)) {
          return { ok: false, message: `Feature "${row.key}": valor numérico inválido` };
        }
        value = n;
      } else {
        value = String(row.value ?? "");
      }
      out.push({ key: row.key, value });
    }
    return { ok: true, entries: out };
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const priceNumber = Number(priceAmount);
    if (!Number.isFinite(priceNumber)) {
      setError("Preço inválido");
      return;
    }

    const featuresResult = buildFeaturesPayload();
    if (!featuresResult.ok) {
      setError(featuresResult.message);
      return;
    }

    if (priceWillChange) {
      const ok = window.confirm(
        "Mudar o preço cria um novo Stripe Price. Subscribers existentes permanecem no preço antigo até a renovação. Continuar?",
      );
      if (!ok) return;
    }

    startTransition(async () => {
      const payload =
        mode === "create"
          ? {
              slug,
              name,
              description: description || null,
              billing_period: billingPeriod,
              price_amount: priceNumber,
              currency,
              features: featuresResult.entries,
              is_visible: isVisible,
              app_slugs: appSlugs,
            }
          : {
              id: initial!.id,
              name,
              description: description || null,
              billing_period: billingPeriod,
              price_amount: priceNumber,
              currency,
              features: featuresResult.entries,
              is_visible: isVisible,
              app_slugs: appSlugs,
            };

      const result =
        mode === "create"
          ? await createPlanAction(payload)
          : await updatePlanAction(payload);

      if (!result.ok) {
        setError(result.message ?? result.error);
        return;
      }

      if (mode === "create" && "id" in result) {
        router.push(`/plans/${result.id}`);
      } else {
        router.push("/plans");
      }
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div>
        <label className="block text-sm font-medium mb-1">
          Slug <span className="text-destructive">*</span>
        </label>
        <input
          type="text"
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          disabled={mode === "edit"}
          required
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm font-mono disabled:opacity-50"
          placeholder="case-predictor-pro"
        />
        <p className="mt-1 text-xs text-muted-foreground">
          Apenas letras minúsculas, números e hífen. Não pode mudar depois de criado.
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">
          Nome <span className="text-destructive">*</span>
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
          placeholder="Case Predictor Pro"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Descrição</label>
        <textarea
          value={description ?? ""}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
          placeholder="O que esse plano libera, em uma linha"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="block text-sm font-medium mb-1">Periodicidade</label>
          <select
            value={billingPeriod}
            onChange={(e) => setBillingPeriod(e.target.value as typeof billingPeriod)}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
          >
            {PERIOD_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">
            Preço <span className="text-destructive">*</span>
          </label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={priceAmount}
            onChange={(e) => setPriceAmount(e.target.value)}
            required
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm font-mono"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Moeda</label>
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value as typeof currency)}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
          >
            {CURRENCY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {customSelected && (
        <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          Periodicidade <strong>custom</strong> não cria Stripe Product/Price. Use para acordos enterprise faturados manualmente.
        </div>
      )}

      {priceWillChange && (
        <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          Mudança de preço detectada. Stripe não permite editar Price existente; um novo será criado e o antigo arquivado. Subscribers atuais permanecem no preço antigo até renovação.
        </div>
      )}

      <div>
        <div className="mb-1 flex items-center justify-between">
          <label className="block text-sm font-medium">Features</label>
          <button
            type="button"
            onClick={addFeatureRow}
            className="rounded-md border border-border px-2 py-1 text-xs hover:bg-muted"
          >
            + adicionar
          </button>
        </div>
        <p className="text-xs text-muted-foreground mb-2">
          Estrutura livre. Apps consumidores leem do JWT. Use snake_case nas chaves.
        </p>
        {features.length === 0 ? (
          <div className="rounded-md border border-dashed border-border px-3 py-4 text-center text-xs text-muted-foreground">
            Nenhuma feature.
          </div>
        ) : (
          <div className="space-y-2">
            {features.map((row) => (
              <div key={row.id} className="flex items-center gap-2">
                <input
                  type="text"
                  value={row.key}
                  onChange={(e) => updateFeatureRow(row.id, { key: e.target.value })}
                  placeholder="max_users"
                  className="flex-1 rounded-md border border-border bg-background px-2 py-1.5 text-sm font-mono"
                />
                <select
                  value={row.valueType}
                  onChange={(e) => updateFeatureRow(row.id, { valueType: e.target.value as FeatureValueType })}
                  className="rounded-md border border-border bg-background px-2 py-1.5 text-xs"
                >
                  <option value="string">texto</option>
                  <option value="number">número</option>
                  <option value="boolean">boolean</option>
                </select>
                {row.valueType === "boolean" ? (
                  <select
                    value={String(row.value)}
                    onChange={(e) => updateFeatureRow(row.id, { value: e.target.value === "true" })}
                    className="flex-1 rounded-md border border-border bg-background px-2 py-1.5 text-sm"
                  >
                    <option value="true">true</option>
                    <option value="false">false</option>
                  </select>
                ) : row.valueType === "number" ? (
                  <input
                    type="number"
                    value={typeof row.value === "number" ? row.value : ""}
                    onChange={(e) => updateFeatureRow(row.id, { value: e.target.valueAsNumber })}
                    className="flex-1 rounded-md border border-border bg-background px-2 py-1.5 text-sm font-mono"
                  />
                ) : (
                  <input
                    type="text"
                    value={typeof row.value === "string" ? row.value : ""}
                    onChange={(e) => updateFeatureRow(row.id, { value: e.target.value })}
                    className="flex-1 rounded-md border border-border bg-background px-2 py-1.5 text-sm"
                  />
                )}
                <button
                  type="button"
                  onClick={() => removeFeatureRow(row.id)}
                  className="rounded-md border border-border px-2 py-1.5 text-xs hover:bg-destructive/10 hover:text-destructive"
                  aria-label="Remover feature"
                >
                  remover
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">
          Apps liberados <span className="text-destructive">*</span>
        </label>
        {sortedApps.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            Nenhum app cadastrado. Crie apps em /apps antes de criar planos.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {sortedApps.map((app) => {
              const checked = appSlugs.includes(app.slug);
              return (
                <label
                  key={app.slug}
                  className="flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm cursor-pointer hover:bg-muted"
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleApp(app.slug)}
                  />
                  <span>{app.name}</span>
                  <span className="ml-auto text-xs text-muted-foreground font-mono">{app.slug}</span>
                </label>
              );
            })}
          </div>
        )}
      </div>

      <div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={isVisible}
            onChange={(e) => setIsVisible(e.target.checked)}
          />
          <span>Visível na listagem pública</span>
        </label>
        <p className="ml-6 mt-1 text-xs text-muted-foreground">
          Quando desligado, o plano só pode ser oferecido por convite/link direto.
        </p>
      </div>

      {error && (
        <div className="rounded-md border border-destructive bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-foreground text-background px-4 py-2 text-sm font-medium hover:opacity-90 disabled:opacity-50"
        >
          {pending ? "Salvando..." : mode === "create" ? "Criar plano" : "Salvar alterações"}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-md border border-border px-4 py-2 text-sm hover:bg-muted"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
