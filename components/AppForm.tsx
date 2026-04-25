"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createAppAction } from "@/app/_actions/create-app";
import { updateAppAction } from "@/app/_actions/update-app";
import type { AppDetail } from "@/lib/data";

type Mode = "create" | "edit";

export type AppFormProps = {
  mode: Mode;
  initial?: AppDetail;
};

const STATUS_OPTIONS: Array<{ value: "active" | "beta" | "sunset" | "archived"; label: string }> = [
  { value: "active", label: "Ativo" },
  { value: "beta", label: "Beta" },
  { value: "sunset", label: "Em descontinuação" },
  { value: "archived", label: "Arquivado" },
];

export function AppForm({ mode, initial }: AppFormProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [publicUrl, setPublicUrl] = useState(initial?.public_url ?? "");
  const [iconUrl, setIconUrl] = useState(initial?.icon_url ?? "");
  const [status, setStatus] = useState<"active" | "beta" | "sunset" | "archived">(
    (initial?.status as "active" | "beta" | "sunset" | "archived") ?? "active",
  );
  const [responsibleUserId, setResponsibleUserId] = useState(initial?.responsible_user_id ?? "");

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const payload = {
      slug,
      name,
      description: description || null,
      public_url: publicUrl || null,
      icon_url: iconUrl || null,
      status,
      responsible_user_id: responsibleUserId || null,
    };

    startTransition(async () => {
      const result =
        mode === "create"
          ? await createAppAction({
              ...payload,
              role_catalog: { "tenant-admin": "Tenant Admin", member: "Member" },
            })
          : await updateAppAction(payload);

      if (!result.ok) {
        setError(result.message ?? result.error);
        return;
      }

      router.push(mode === "create" ? `/apps/${slug}` : "/apps");
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
          placeholder="case-predictor"
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
          placeholder="Case Predictor"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Descrição</label>
        <textarea
          value={description ?? ""}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
          placeholder="O que esse app faz, em uma linha"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">URL pública</label>
        <input
          type="url"
          value={publicUrl ?? ""}
          onChange={(e) => setPublicUrl(e.target.value)}
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
          placeholder="https://case-predictor.sociosai.com"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">URL do ícone</label>
        <input
          type="url"
          value={iconUrl ?? ""}
          onChange={(e) => setIconUrl(e.target.value)}
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
          placeholder="https://..."
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Status</label>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as typeof status)}
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Responsável (user UUID)</label>
        <input
          type="text"
          value={responsibleUserId ?? ""}
          onChange={(e) => setResponsibleUserId(e.target.value)}
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm font-mono"
          placeholder="opcional"
        />
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
          {pending ? "Salvando..." : mode === "create" ? "Criar app" : "Salvar alterações"}
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
