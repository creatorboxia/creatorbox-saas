import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

import { CalendarioMensal } from "@/components/calendario-mensal";
import { listConteudos } from "@/lib/creatorbox.functions";

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

  // Filtro extra no cliente: garante que só conteúdos deste cliente aparecem.
  return (
    <CalendarioMensal conteudos={(conteudos ?? []).filter((c) => c.cliente_id === clienteId)} />
  );
}
