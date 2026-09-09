import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";

import { Button } from "@/components/ui/button";
import { getCliente } from "@/lib/creatorbox.functions";

export const Route = createFileRoute("/_authenticated/clientes/$clienteId/estrategia")({
  head: () => ({
    meta: [
      { title: "Estratégia do cliente — CreatorBox" },
      { name: "description", content: "Objetivos, posicionamento e tom de voz do cliente." },
      { property: "og:title", content: "Estratégia do cliente — CreatorBox" },
      { property: "og:description", content: "Objetivos, posicionamento e tom de voz do cliente." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Estrategia,
});

function Estrategia() {
  const { clienteId } = Route.useParams();
  const { data: cliente } = useQuery({
    queryKey: ["cliente", clienteId],
    queryFn: () => getCliente({ data: { id: clienteId } }),
  });

  const itens = [
    { titulo: "Objetivo do cliente", texto: cliente?.objetivo_cliente },
    { titulo: "Objetivo nas redes sociais", texto: cliente?.objetivo_redes_sociais },
    { titulo: "Posicionamento", texto: cliente?.posicionamento },
    { titulo: "Diferenciais", texto: cliente?.diferenciais },
    { titulo: "Tom de comunicação", texto: cliente?.tom_comunicacao },
    { titulo: "Perfil do consumidor", texto: cliente?.perfil_consumidor },
    { titulo: "Necessidades", texto: cliente?.necessidades },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Base para todas as pautas e roteiros desse cliente.
        </p>
        <Button asChild variant="outline" size="sm">
          <Link to="/clientes/$clienteId/informacoes" params={{ clienteId }}>
            Editar
          </Link>
        </Button>
      </div>

      {itens.map((item) => (
        <div key={item.titulo} className="rounded-2xl border border-border bg-card/40 p-5">
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            {item.titulo}
          </p>
          <p className="mt-2 text-sm whitespace-pre-wrap">
            {item.texto && item.texto.trim() !== "" ? item.texto : "Não informado ainda."}
          </p>
        </div>
      ))}
    </div>
  );
}
