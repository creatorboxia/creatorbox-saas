import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

import { useState } from "react";

import { CalendarioMensal } from "@/components/calendario-mensal";
import { ConteudoDialog } from "@/components/conteudo-dialog";
import { listConteudos, type Conteudo } from "@/lib/creatorbox.functions";

export const Route = createFileRoute("/_authenticated/clientes/$clienteId/calendario")({
  head: () => ({
    meta: [
      { title: "Calendário do cliente — CreatorBox" },
      { name: "description", content: "Calendário mensal de publicações planejadas do cliente." },
      { property: "og:title", content: "Calendário do cliente — CreatorBox" },
      {
        property: "og:description",
        content: "Calendário mensal de publicações planejadas do cliente.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Calendario,
});

function Calendario() {
  const { clienteId } = Route.useParams();
  const { data: conteudos } = useQuery({
    queryKey: ["conteudos", clienteId],
    queryFn: () => listConteudos({ data: { clienteId } }),
  });

  const [selecionado, setSelecionado] = useState<Conteudo | null>(null);

  // Filtro extra no cliente: garante que só conteúdos deste cliente aparecem.
  return (
    <>
      <CalendarioMensal
        conteudos={(conteudos ?? []).filter((c) => c.cliente_id === clienteId)}
        onSelect={setSelecionado}
      />
      <ConteudoDialog
        open={!!selecionado}
        onOpenChange={(o) => !o && setSelecionado(null)}
        conteudo={selecionado}
        clienteFixo={clienteId}
      />
    </>
  );
}
