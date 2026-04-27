import Link from "next/link";
import type { AuditFilterValues } from "@/lib/audit-url-params";

export type AuditPaginationProps = {
  currentParams: Partial<AuditFilterValues>;
  nextCursor: string | null;
};

export function AuditPagination({ currentParams, nextCursor }: AuditPaginationProps) {
  if (!nextCursor) return null;

  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(currentParams)) {
    if (typeof v === "string" && v.length > 0) params.set(k, v);
  }
  params.set("after", nextCursor);

  return (
    <div className="mt-4 flex justify-center">
      <Link
        href={`/audit?${params.toString()}`}
        className="rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium hover:bg-muted"
      >
        Carregar mais
      </Link>
    </div>
  );
}
