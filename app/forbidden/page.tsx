import { Lock } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { buttonClasses } from "@/components/ui/button";

export const dynamic = "force-static";

export default function ForbiddenPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md">
        <EmptyState
          icon={<Lock />}
          title="Acesso negado"
          description="Esta área é restrita a administradores do ecossistema Sócios AI. Se você acredita que isso é um erro, contate o time."
          action={
            <a
              href="https://id.sociosai.com/"
              className={buttonClasses({ variant: "primary" })}
            >
              Voltar para id.sociosai.com
            </a>
          }
        />
      </div>
    </main>
  );
}
