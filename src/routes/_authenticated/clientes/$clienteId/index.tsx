import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

import { getCliente, listConteudos } from "@/lib/creatorbox.functions";

export const Route = createFileRoute("/_authenticated/clientes/$clienteId/")({
  head: () => ({
    meta: [
      { title: "Visão geral do cliente — CreatorBox" },
      { name: "description", content: "Resumo do briefing e dos conteúdos do cliente." },
      { property: "og:title", content: "Visão geral do cliente — CreatorBox" },
      { property: "og:description", content: "Resumo do briefing e dos conteúdos do cliente." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: VisaoGeral,
});

function VisaoGeral() {
  const { clienteId } = Route.useParams();
  const { data: cliente } = useQuery({
    queryKey: ["cliente", clienteId],
    queryFn: () => getCliente({ data: { id: clienteId } }),
  });
  const { data: conteudos } = useQuery({
    queryKey: ["conteudos", clienteId],
    queryFn: () => listConteudos({ data: { clienteId } }),
  });

  const total = conteudos?.length ?? 0;
  const planejados = (conteudos ?? []).filter((c) => c.status === "planejado").length;
  const publicados = (conteudos ?? []).filter((c) => c.status === "publicado").length;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <Card label="Conteúdos cadastrados" valor={total} />
        <Card label="Planejados" valor={planejados} />
        <Card label="Publicados" valor={publicados} />
      </div>

      <section className="grid gap-4 sm:grid-cols-2">
        <Bloco titulo="Nicho" texto={cliente?.nicho} />
        <Bloco titulo="Cidade" texto={cliente?.cidade} />
        <Bloco titulo="Serviço ou produto" texto={cliente?.servico_produto} largo />
        <Bloco titulo="Público-alvo" texto={cliente?.publico_alvo} largo />
        <Bloco titulo="Dores" texto={cliente?.dores} />
        <Bloco titulo="Desejos" texto={cliente?.desejos} />
      </section>
    </div>
  );
}

function Card({ label, valor }: { label: string; valor: number }) {
  return (
    <div className="rounded-2xl border border-border bg-card/60 p-5">
      <p className="font-display text-3xl font-semibold">{valor}</p>
      <p className="mt-1 text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function Bloco({
  titulo,
  texto,
  largo,
}: {
  titulo: string;
  texto?: string | null | undefined;
  largo?: boolean | undefined;
}) {
  return (
    <div
      className={`rounded-2xl border border-border bg-card/40 p-5 ${largo ? "sm:col-span-2" : ""}`}
    >
      <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{titulo}</p>
      <p className="mt-2 text-sm whitespace-pre-wrap">
        {texto && texto.trim() !== "" ? texto : "Não informado ainda."}
      </p>
    </div>
  );
}
