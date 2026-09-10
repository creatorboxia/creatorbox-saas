import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Lightbulb } from "lucide-react";
import { useState } from "react";

import { useClientes, FiltroCliente } from "@/components/filtro-cliente";
import { Badge } from "@/components/ui/badge";
import { listConteudos } from "@/lib/creatorbox.functions";

export const Route = createFileRoute("/_authenticated/ferramentas/ideias")({
  head: () => ({
    meta: [
      { title: "Ideias — CreatorBox" },
      { name: "description", content: "Banco de ideias de conteúdo de todos os clientes." },
      { property: "og:title", content: "Ideias — CreatorBox" },
      { property: "og:description", content: "Banco de ideias de conteúdo de todos os clientes." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Ideias,
});

const tipoLabel: Record<string, string> = {
  reel: "Reel",
  carrossel: "Carrossel",
  story: "Story",
  post: "Post",
};

function Ideias() {
  const [filtro, setFiltro] = useState("todos");
  const { data: clientes } = useClientes();
  const { data: conteudos } = useQuery({
    queryKey: ["conteudos", "geral"],
    queryFn: () => listConteudos({ data: {} }),
  });

  const nomeCliente = (id: string) => clientes?.find((c) => c.id === id)?.nome ?? "Cliente";

  const ideias = (conteudos ?? []).filter(
    (c) => c.status === "ideia" && (filtro === "todos" || c.cliente_id === filtro),
  );

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Ideias</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Banco de ideias ainda não planejadas, de todos os clientes.
          </p>
        </div>
        <FiltroCliente valor={filtro} onChange={setFiltro} />
      </div>

      {ideias.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-dashed border-border p-10 text-center">
          <Lightbulb className="mx-auto size-8 text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">
            Nenhuma ideia por aqui. Cadastre conteúdos com status "Ideia" na área de um cliente.
          </p>
        </div>
      ) : (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {ideias.map((ideia) => (
            <Link
              key={ideia.id}
              to="/clientes/$clienteId/conteudos"
              params={{ clienteId: ideia.cliente_id }}
              className="rounded-2xl border border-border bg-card/40 p-5 transition-colors hover:border-primary/50"
            >
              <div className="flex items-center justify-between gap-2">
                <Badge variant="secondary">{tipoLabel[ideia.tipo] ?? ideia.tipo}</Badge>
                <span className="truncate text-xs text-muted-foreground">
                  {nomeCliente(ideia.cliente_id)}
                </span>
              </div>
              <p className="mt-3 font-medium">{ideia.titulo}</p>
              {ideia.ideia && (
                <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">{ideia.ideia}</p>
              )}
              {ideia.categoria && (
                <p className="mt-3 text-xs text-muted-foreground">Categoria: {ideia.categoria}</p>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
