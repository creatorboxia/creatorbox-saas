import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Clapperboard } from "lucide-react";
import { useState } from "react";

import { useClientes, FiltroCliente } from "@/components/filtro-cliente";
import { Badge } from "@/components/ui/badge";
import { listConteudos } from "@/lib/creatorbox.functions";

export const Route = createFileRoute("/_authenticated/ferramentas/roteiros")({
  head: () => ({
    meta: [
      { title: "Roteiros — CreatorBox" },
      { name: "description", content: "Roteiros escritos para os conteúdos de todos os clientes." },
      { property: "og:title", content: "Roteiros — CreatorBox" },
      { property: "og:description", content: "Roteiros escritos para os conteúdos de todos os clientes." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Roteiros,
});

const statusLabel: Record<string, string> = {
  ideia: "Ideia",
  planejado: "Planejado",
  produzido: "Produzido",
  publicado: "Publicado",
};

function Roteiros() {
  const [filtro, setFiltro] = useState("todos");
  const { data: clientes } = useClientes();
  const { data: conteudos } = useQuery({
    queryKey: ["conteudos", "geral"],
    queryFn: () => listConteudos({ data: {} }),
  });

  const nomeCliente = (id: string) => clientes?.find((c) => c.id === id)?.nome ?? "Cliente";

  const roteiros = (conteudos ?? []).filter(
    (c) =>
      c.roteiro &&
      c.roteiro.trim() !== "" &&
      (filtro === "todos" || c.cliente_id === filtro),
  );

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Roteiros</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Conteúdos que já têm roteiro escrito, de todos os clientes.
          </p>
        </div>
        <FiltroCliente valor={filtro} onChange={setFiltro} />
      </div>

      {roteiros.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-dashed border-border p-10 text-center">
          <Clapperboard className="mx-auto size-8 text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">
            Nenhum roteiro ainda. Escreva o roteiro dentro de um conteúdo na área do cliente.
          </p>
        </div>
      ) : (
        <div className="mt-8 space-y-4">
          {roteiros.map((conteudo) => (
            <Link
              key={conteudo.id}
              to="/clientes/$clienteId/conteudos"
              params={{ clienteId: conteudo.cliente_id }}
              className="block rounded-2xl border border-border bg-card/40 p-5 transition-colors hover:border-primary/50"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-medium">{conteudo.titulo}</p>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    {nomeCliente(conteudo.cliente_id)}
                  </span>
                  <Badge variant="secondary">{statusLabel[conteudo.status] ?? conteudo.status}</Badge>
                </div>
              </div>
              <p className="mt-3 text-sm whitespace-pre-wrap text-muted-foreground">
                {conteudo.roteiro}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
