import Link from "next/link";
import { AuditList } from "./AuditList";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { AuditEvent } from "@/lib/data";

type Props = {
  userId: string;
  events: AuditEvent[];
};

export function AuditTab({ userId, events }: Props) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="text-lg">Eventos recentes deste usuário</CardTitle>
        <Link
          href={`/audit?target_id=${userId}`}
          className="text-sm text-primary hover:underline"
        >
          Ver tudo no log de auditoria →
        </Link>
      </CardHeader>
      <CardContent>
        <AuditList events={events} />
      </CardContent>
    </Card>
  );
}
