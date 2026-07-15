"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createSalesMaterialAction } from "@/app/_actions/create-sales-material";
import { updateSalesMaterialAction } from "@/app/_actions/update-sales-material";
import type { SalesMaterialRow, SalesMaterialAssetType } from "@/lib/data";

type Mode = "create" | "edit";

export type AppOption = { slug: string; name: string };

export type SalesMaterialFormProps = {
  mode: Mode;
  apps: AppOption[];
  initial?: SalesMaterialRow;
};

const TYPE_OPTIONS: Array<{ value: SalesMaterialAssetType; label: string }> = [
  { value: "pitch_deck", label: "Pitch deck" },
  { value: "pdf", label: "PDF" },
  { value: "banner", label: "Banner" },
  { value: "video", label: "Vídeo" },
  { value: "other", label: "Outro" },
];

export function SalesMaterialForm({ mode, apps, initial }: SalesMaterialFormProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [assetUrl, setAssetUrl] = useState(initial?.asset_url ?? "");
  const [assetType, setAssetType] = useState<SalesMaterialAssetType>(
    initial?.asset_type ?? "pitch_deck",
  );
  const [appSlug, setAppSlug] = useState(initial?.app_slug ?? "");
  const [isActive, setIsActive] = useState(initial?.is_active ?? true);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const base = {
      title,
      description: description || null,
      asset_url: assetUrl,
      asset_type: assetType,
      app_slug: appSlug || null,
    };

    startTransition(async () => {
      const result =
        mode === "create"
          ? await createSalesMaterialAction(base)
          : await updateSalesMaterialAction({
              ...base,
              id: initial!.id,
              is_active: isActive,
            });

      if (!result.ok) {
        setError(result.message ?? result.error);
        return;
      }

      router.push("/materials");
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div>
        <label className="block text-sm font-medium mb-1">
          Título <span className="text-destructive">*</span>
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
          placeholder="Pitch Deck Institucional"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Descrição</label>
        <textarea
          value={description ?? ""}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
          placeholder="Para que serve, quando usar"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">
          URL do arquivo <span className="text-destructive">*</span>
        </label>
        <input
          type="url"
          value={assetUrl}
          onChange={(e) => setAssetUrl(e.target.value)}
          required
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
          placeholder="https://..."
        />
        <p className="mt-1 text-xs text-muted-foreground">
          Precisa começar com https://
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">
          Tipo <span className="text-destructive">*</span>
        </label>
        <select
          value={assetType}
          onChange={(e) => setAssetType(e.target.value as SalesMaterialAssetType)}
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
        >
          {TYPE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">App</label>
        <select
          value={appSlug}
          onChange={(e) => setAppSlug(e.target.value)}
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
        >
          <option value="">Geral (todos os apps)</option>
          {apps.map((app) => (
            <option key={app.slug} value={app.slug}>
              {app.name}
            </option>
          ))}
        </select>
        <p className="mt-1 text-xs text-muted-foreground">
          Deixe em &quot;Geral&quot; para materiais que servem a qualquer app.
        </p>
      </div>

      {mode === "edit" ? (
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            className="h-4 w-4 rounded border-border"
          />
          Visível para os parceiros
        </label>
      ) : null}

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
          {pending
            ? "Salvando..."
            : mode === "create"
              ? "Criar material"
              : "Salvar alterações"}
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
