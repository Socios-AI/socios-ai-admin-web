// Resolve o host (origin) do convite a partir do mapa nicho→domínio gravado
// em apps.<app>.metadata.niche_domains. Fonte: Identity, espelho de
// shared/nicheSubdomains.ts do app beauty. Pure · sem I/O.

type MetadataLike = Record<string, unknown> | null | undefined;

function nonEmptyString(v: unknown): string | null {
  return typeof v === "string" && v.trim() !== "" ? v : null;
}

export function resolveNicheHost(
  metadata: MetadataLike,
  niche: string | null | undefined,
  appFallback: string,
): string {
  const meta = (metadata && typeof metadata === "object" ? metadata : {}) as Record<string, unknown>;
  const domains =
    meta.niche_domains && typeof meta.niche_domains === "object" && !Array.isArray(meta.niche_domains)
      ? (meta.niche_domains as Record<string, unknown>)
      : {};
  const fallback = nonEmptyString(meta.niche_domain_fallback) ?? appFallback;
  if (niche) {
    const host = nonEmptyString(domains[niche]);
    if (host) return host;
  }
  return fallback;
}
