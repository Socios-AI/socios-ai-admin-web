import Link from "next/link";
import { AuditList } from "./AuditList";
import type { AuditEvent } from "@/lib/data";

type Props = {
  userId: string;
  events: AuditEvent[];
};

export function AuditTab({ userId, events }: Props) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg">Eventos recentes deste usuário</h2>
        <Link
          href={`/audit?target_id=${userId}`}
          className="text-sm text-primary hover:underline"
        >
          Ver tudo no log de auditoria →
        </Link>
      </div>
      <AuditList events={events} />
    </div>
  );
}
