import { PageHeader } from "@/components/ui/page-header";
import { ContractsReviewTable } from "@/components/ContractsReviewTable";
import { listPendingContractsAction } from "@/app/_actions/contracts";

export const dynamic = "force-dynamic";

export default async function ContractsReviewPage() {
  const res = await listPendingContractsAction();
  const rows = res.ok ? res.rows : [];

  return (
    <>
      <PageHeader title="Contratos" subtitle="Aguardando revisão e envio" />
      {!res.ok ? (
        <p className="text-sm text-destructive">Sem permissão para ver contratos.</p>
      ) : (
        <ContractsReviewTable rows={rows} />
      )}
    </>
  );
}
