import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, Outlet } from "@tanstack/react-router";

import { Badge } from "@/components/ui/badge";
import { getCliente } from "@/lib/creatorbox.functions";

export const Route = createFileRoute("/_authenticated/clientes/$clienteId")({
  component: ClienteLayout,
});

export function useClienteAtual() {
  const { clienteId } = Route.useParams();
  return useQuery({
    queryKey: ["cliente", clienteId],
    queryFn: () => getCliente({ data: { id: clienteId } }),
  });
}

function ClienteLayout() {
  const { clienteId } = Route.useParams();
  const { data: cliente } = useClienteAtual();

  const abas = [
    { to: "/clientes/$clienteId", label: "Visão geral" },
    { to: "/clientes/$clienteId/estrategia", label: "Estratégia" },
    { to: "/clientes/$clienteId/calendario", label: "Calendário" },
    { to: "/clientes/$clienteId/conteudos", label: "Conteúdos" },
    { to: "/clientes/$clienteId/informacoes", label: "Informações" },
  ] as const;

  return (
    <div>
      <header className="border-b border-border px-6 pt-8 pb-0">
        <div className="mx-auto max-w-5xl">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold">{cliente?.nome ?? "Cliente"}</h1>
            {cliente && (
              <Badge variant={cliente.ativo ? "default" : "secondary"}>
                {cliente.ativo ? "Ativo" : "Arquivado"}
              </Badge>
            )}
            {cliente?.instagram && (
              <span className="text-sm text-muted-foreground">{cliente.instagram}</span>
            )}
          </div>
          <nav className="mt-6 flex gap-1 overflow-x-auto">
            {abas.map((aba) => (
              <Link
                key={aba.to}
                to={aba.to}
                params={{ clienteId }}
                activeOptions={{ exact: true }}
                activeProps={{ className: "border-primary text-foreground" }}
                className="shrink-0 border-b-2 border-transparent px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                {aba.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <div className="mx-auto max-w-5xl px-6 py-8">
        <Outlet />
      </div>
    </div>
  );
}
