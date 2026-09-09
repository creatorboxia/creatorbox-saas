import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, CalendarDays, CheckCircle2, Lightbulb, Plus, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getDashboard } from "@/lib/creatorbox.functions";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Painel — CreatorBox" },
      {
        name: "description",
        content: "Visão geral dos seus clientes e conteúdos planejados no CreatorBox.",
      },
      { property: "og:title", content: "Painel — CreatorBox" },
      {
        property: "og:description",
        content: "Visão geral dos seus clientes e conteúdos planejados no CreatorBox.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => getDashboard(),
  });

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold">Painel</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            O retrato do seu portfólio de clientes hoje.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link to="/clientes/novo">
            <Plus className="size-4" />
            Adicionar cliente
          </Link>
        </Button>
      </div>

      {isLoading ? (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-28 rounded-2xl" />
          ))}
        </div>
      ) : (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Metrica icon={Users} label="Clientes ativos" valor={data?.clientesAtivos ?? 0} />
          <Metrica icon={CalendarDays} label="Conteúdos planejados" valor={data?.planejados ?? 0} />
          <Metrica icon={CheckCircle2} label="Publicados" valor={data?.publicados ?? 0} />
          <Metrica icon={Lightbulb} label="Ideias no banco" valor={data?.ideias ?? 0} />
        </div>
      )}

      <Link
        to="/chat"
        className="group mt-6 flex items-center justify-between rounded-2xl border border-primary/30 bg-primary/10 px-6 py-6 transition-colors hover:border-primary/60"
      >
        <div>
          <p className="font-display text-lg font-semibold">Destravar ideias no chat</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Converse sobre pautas, roteiros e legendas de qualquer cliente.
          </p>
        </div>
        <ArrowRight className="size-5 text-primary transition-transform group-hover:translate-x-1" />
      </Link>

      <div className="mt-8 grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border border-border bg-card/60 p-6">
          <h2 className="text-base font-semibold">Clientes recentes</h2>
          <div className="mt-4 space-y-2">
            {(data?.clientesRecentes ?? []).map((cliente) => (
              <Link
                key={cliente.id}
                to="/clientes/$clienteId"
                params={{ clienteId: cliente.id }}
                className="flex items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors hover:bg-accent/50"
              >
                <span className="truncate">{cliente.nome}</span>
                <span className="text-xs text-muted-foreground">{cliente.nicho ?? "—"}</span>
              </Link>
            ))}
            {data?.clientesRecentes.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Você ainda não cadastrou clientes. Comece adicionando o primeiro.
              </p>
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card/60 p-6">
          <h2 className="text-base font-semibold">Próximos conteúdos</h2>
          <div className="mt-4 space-y-2">
            {(data?.proximosConteudos ?? []).map((conteudo) => (
              <div
                key={conteudo.id}
                className="flex items-center justify-between rounded-lg px-3 py-2 text-sm"
              >
                <span className="truncate">{conteudo.titulo}</span>
                <span className="text-xs text-muted-foreground">
                  {conteudo.data_planejada
                    ? new Date(`${conteudo.data_planejada}T00:00:00`).toLocaleDateString("pt-BR")
                    : "sem data"}
                </span>
              </div>
            ))}
            {data?.proximosConteudos.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Nenhum conteúdo com data marcada ainda.
              </p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function Metrica({
  icon: Icon,
  label,
  valor,
}: {
  icon: typeof Users;
  label: string;
  valor: number;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card/60 p-5">
      <Icon className="size-4 text-primary" />
      <p className="mt-4 font-display text-3xl font-semibold">{valor}</p>
      <p className="mt-1 text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
