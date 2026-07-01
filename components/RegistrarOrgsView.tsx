import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { RegistrarOrgsTable } from "@/components/RegistrarOrgsTable";
import { buttonClasses } from "@/components/ui/button";
import { listOrgsForRegistrar } from "@/lib/data-registrar";

// View curada do cadastrador · orgs sem nenhum dado de assinatura/financeiro.
export async function RegistrarOrgsView() {
  const orgs = await listOrgsForRegistrar();

  return (
    <>
      <PageHeader
        title="Organizações"
        subtitle={`${orgs.length} no total`}
        actions={
          <Link href="/orgs/new" className={buttonClasses({ variant: "primary" })}>
            Novo cliente
          </Link>
        }
      />

      <RegistrarOrgsTable orgs={orgs} />
    </>
  );
}
