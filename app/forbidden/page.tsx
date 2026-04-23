export const dynamic = "force-static";

export default function ForbiddenPage() {
  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="max-w-md text-center space-y-4">
        <h1 className="font-display font-semibold text-2xl">Acesso negado</h1>
        <p className="text-muted-foreground">
          Esta área é restrita a administradores do ecossistema Sócios AI. Se você acredita que isso é um erro, contate o time.
        </p>
        <a
          href="https://id.sociosai.com/"
          className="inline-block rounded-lg bg-primary text-primary-foreground font-medium px-4 py-2.5 hover:opacity-90 transition"
        >
          Voltar para id.sociosai.com
        </a>
      </div>
    </main>
  );
}
