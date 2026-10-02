import { createFileRoute, Link } from "@tanstack/react-router";
import { z } from "zod";
import { MailCheck } from "lucide-react";

import { Logo } from "@/components/logo";
import { PlanosGrid } from "@/components/planos-grid";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/planos")({
  validateSearch: z.object({ status: z.enum(["sucesso", "cancelado"]).optional() }),
  head: () => ({
    meta: [
      { title: "Planos — CreatorBox" },
      {
        name: "description",
        content: "Escolha o plano mensal do CreatorBox: Starter, Pro ou Agência.",
      },
      { property: "og:title", content: "Planos — CreatorBox" },
      {
        property: "og:description",
        content: "Starter, Pro ou Agência: créditos mensais para o seu assistente de conteúdo.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Planos,
});

function Planos() {
  const { status } = Route.useSearch();
  return (
    <main className="min-h-screen surface-grid">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <Link to="/">
          <Logo size="md" />
        </Link>
        <Button asChild variant="ghost" size="sm">
          <Link to="/auth">Já sou assinante</Link>
        </Button>
      </header>
      <section className="mx-auto max-w-5xl px-6 pt-16 pb-28">
        {status === "sucesso" ? (
          <div className="mx-auto max-w-lg rounded-2xl border border-primary/40 bg-card/80 p-10 text-center">
            <MailCheck className="mx-auto size-10 text-primary" />
            <h1 className="mt-5 text-2xl font-semibold">Assinatura confirmada</h1>
            <p className="mt-3 text-sm text-muted-foreground">
              Enviamos para o e-mail da compra um link de primeiro acesso. Abra o link, defina sua
              senha e você entra direto no seu painel.
            </p>
            <Button asChild variant="outline" className="mt-6">
              <Link to="/auth">Ir para o login</Link>
            </Button>
          </div>
        ) : (
          <>
            <div className="mx-auto max-w-2xl text-center">
              <span className="text-xs font-medium tracking-[0.18em] text-primary uppercase">
                Planos
              </span>
              <h1 className="mt-4 text-4xl font-semibold sm:text-5xl">Escolha seu plano</h1>
              <p className="mt-4 text-muted-foreground">
                O acesso ao CreatorBox é exclusivo para assinantes.
              </p>
              {status === "cancelado" && (
                <p className="mt-4 text-sm text-muted-foreground">
                  Pagamento cancelado. Você pode tentar de novo quando quiser.
                </p>
              )}
            </div>
            <div className="mt-14">
              <PlanosGrid />
            </div>
          </>
        )}
      </section>
    </main>
  );
}
