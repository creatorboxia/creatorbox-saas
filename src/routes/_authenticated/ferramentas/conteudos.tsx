import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { FileText } from "lucide-react";
import { useState } from "react";

import { useClientes, FiltroCliente } from "@/components/filtro-cliente";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { listConteudos } from "@/lib/creatorbox.functions";

export const Route = createFileRoute("/_authenticated/ferramentas/conteudos")({
  head: () => ({
    meta: [
      { title: "Conteúdos — CreatorBox" },
      { name: "description", content: "Todos os conteúdos cadastrados, de todos os clientes." },
      { property: "og:title", content: "Conteúdos — CreatorBox" },
      { property: "og:description", content: "Todos os conteúdos cadastrados, de todos os clientes." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ConteudosGeral,
});

const tipoLabel: Record<string, string> = {
  reel: "Reel",
  carrossel: "Carrossel",
  story: "Story",
  post: "Post",
};

const statusLabel: Record<string, string> = {
  ideia: "Ideia",
  planejado: "Planejado",
  produzido: "Produzido",
  publicado: "Publicado",
};

function ConteudosGeral() {
  const [filtroCliente, setFiltroCliente] = useState("todos");
  const [filtroStatus, setFiltroStatus] = useState("todos");
  const { data: clientes } = useClientes();
  const { data: conteudos } = useQuery({
    queryKey: ["conteudos", "geral"],
    queryFn: () => listConteudos({ data: {} }),
  });

  const nomeCliente = (id: string) => clientes?.find((c) => c.id === id)?.nome ?? "Cliente";

  const visiveis = (conteudos ?? []).filter(
    (c) =>
      (filtroCliente === "todos" || c.cliente_id === filtroCliente) &&
      (filtroStatus === "todos" || c.status === filtroStatus),
  );

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Conteúdos</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Todos os conteúdos cadastrados, com filtro por cliente e status.
          </p>
        </div>
        <div className="flex gap-2">
          <FiltroCliente valor={filtroCliente} onChange={setFiltroCliente} />
          <Select value={filtroStatus} onValueChange={setFiltroStatus}>
            <SelectTrigger className="w-40" aria-label="Filtrar por status">
              <SelectValue placeholder="Todos os status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os status</SelectItem>
              {Object.entries(statusLabel).map(([valor, label]) => (
                <SelectItem key={valor} value={valor}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {visiveis.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-dashed border-border p-10 text-center">
          <FileText className="mx-auto size-8 text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">
            Nenhum conteúdo encontrado com esses filtros.
          </p>
        </div>
      ) : (
        <div className="mt-8 space-y-3">
          {visiveis.map((conteudo) => (
            <Link
              key={conteudo.id}
              to="/clientes/$clienteId/conteudos"
              params={{ clienteId: conteudo.cliente_id }}
              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card/40 p-4 transition-colors hover:border-primary/50"
            >
              <div className="min-w-0">
                <p className="truncate font-medium">{conteudo.titulo}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {nomeCliente(conteudo.cliente_id)}
                  {conteudo.data_planejada
                    ? ` · ${new Date(`${conteudo.data_planejada}T12:00:00`).toLocaleDateString("pt-BR")}`
                    : ""}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline">{tipoLabel[conteudo.tipo] ?? conteudo.tipo}</Badge>
                <Badge variant="secondary">{statusLabel[conteudo.status] ?? conteudo.status}</Badge>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
