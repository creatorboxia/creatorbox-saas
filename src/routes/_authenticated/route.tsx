import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createFileRoute,
  Link,
  Outlet,
  redirect,
  useNavigate,
  useParams,
} from "@tanstack/react-router";
import {
  CalendarDays,
  Clapperboard,
  FileText,
  Home,
  Lightbulb,
  Loader2,
  LogOut,
  Plus,
  Sparkles,
  Users,
} from "lucide-react";
import { useState } from "react";

import { Logo, LogoMark } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/external/client";
import { listClientes } from "@/lib/creatorbox.functions";

// Depois do login com Google a sessão é gravada de forma assíncrona.
// Esperamos alguns instantes antes de mandar a pessoa de volta ao login.
async function aguardarSessao() {
  for (let tentativa = 0; tentativa < 12; tentativa += 1) {
    const { data } = await supabase.auth.getSession();
    if (data.session) return data.session;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  return null;
}

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const sessao = await aguardarSessao();
    if (!sessao) throw redirect({ to: "/auth" });
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  pendingComponent: Carregando,
  pendingMs: 0,
  component: AppLayout,
});

function Carregando() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="size-6 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Carregando seu espaço...</p>
      </div>
    </div>
  );
}

function AppLayout() {
  const [aberto, setAberto] = useState(false);

  return (
    <div className="flex min-h-screen bg-background">
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-72 shrink-0 border-r border-sidebar-border bg-sidebar transition-transform lg:static lg:translate-x-0 ${
          aberto ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <SidebarContent onNavigate={() => setAberto(false)} />
      </aside>

      {aberto && (
        <button
          aria-label="Fechar menu"
          className="fixed inset-0 z-30 bg-background/70 lg:hidden"
          onClick={() => setAberto(false)}
        />
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-3 border-b border-border px-4 py-3 lg:hidden">
          <Button variant="outline" size="sm" onClick={() => setAberto(true)}>
            Menu
          </Button>
          <span className="font-display font-semibold">
            Creator<span className="text-primary">Box</span>
          </span>
        </header>
        <main className="min-w-0 flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function SidebarContent({ onNavigate }: { onNavigate: () => void }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const params = useParams({ strict: false }) as { clienteId?: string };
  const { data: clientes } = useQuery({
    queryKey: ["clientes"],
    queryFn: () => listClientes(),
  });

  async function sair() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="flex h-full flex-col">
      <div className="px-5 py-6">
        <Link to="/dashboard" onClick={onNavigate} className="font-display text-lg font-semibold">
          Creator<span className="text-primary">Box</span>
        </Link>
      </div>

      <nav className="space-y-1 px-3">
        <NavItem to="/dashboard" icon={Home} label="Painel" onNavigate={onNavigate} />
        <NavItem to="/chat" icon={Sparkles} label="Início (chat geral)" onNavigate={onNavigate} />
      </nav>

      <div className="mt-7 px-5">
        <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          Ferramentas
        </span>
      </div>
      <nav className="mt-2 space-y-1 px-3">
        <NavItem
          to="/ferramentas/calendario"
          icon={CalendarDays}
          label="Calendário"
          onNavigate={onNavigate}
        />
        <NavItem
          to="/ferramentas/ideias"
          icon={Lightbulb}
          label="Ideias"
          onNavigate={onNavigate}
        />
        <NavItem
          to="/ferramentas/roteiros"
          icon={Clapperboard}
          label="Roteiros"
          onNavigate={onNavigate}
        />
        <NavItem
          to="/ferramentas/conteudos"
          icon={FileText}
          label="Conteúdos"
          onNavigate={onNavigate}
        />
      </nav>

      <div className="mt-7 flex items-center justify-between px-5">
        <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          Clientes
        </span>
        <Link
          to="/clientes/novo"
          onClick={onNavigate}
          className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground"
          aria-label="Adicionar cliente"
        >
          <Plus className="size-4" />
        </Link>
      </div>

      <ScrollArea className="mt-2 flex-1 px-3">
        <div className="space-y-1 pb-4">
          {(clientes ?? []).map((cliente) => {
            const ativo = params.clienteId === cliente.id;
            return (
              <div key={cliente.id}>
                <Link
                  to="/clientes/$clienteId"
                  params={{ clienteId: cliente.id }}
                  onClick={onNavigate}
                  className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors ${
                    ativo
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground"
                  }`}
                >
                  <Users className="size-4 shrink-0" />
                  <span className="truncate">{cliente.nome}</span>
                </Link>

                {ativo && (
                  <div className="mt-1 ml-6 space-y-0.5 border-l border-sidebar-border pl-3">
                    <SubItem to="/clientes/$clienteId" id={cliente.id} label="Visão geral" onNavigate={onNavigate} />
                    <SubItem
                      to="/clientes/$clienteId/estrategia"
                      id={cliente.id}
                      label="Estratégia"
                      onNavigate={onNavigate}
                    />
                    <SubItem
                      to="/clientes/$clienteId/calendario"
                      id={cliente.id}
                      label="Calendário"
                      onNavigate={onNavigate}
                    />
                    <SubItem
                      to="/clientes/$clienteId/conteudos"
                      id={cliente.id}
                      label="Conteúdos"
                      onNavigate={onNavigate}
                    />
                    <SubItem
                      to="/clientes/$clienteId/informacoes"
                      id={cliente.id}
                      label="Informações do cliente"
                      onNavigate={onNavigate}
                    />
                  </div>
                )}
              </div>
            );
          })}

          {clientes?.length === 0 && (
            <p className="px-3 py-2 text-xs text-muted-foreground">
              Nenhum cliente ainda. Use o + para adicionar o primeiro.
            </p>
          )}
        </div>
      </ScrollArea>

      <div className="border-t border-sidebar-border p-3">
        <Button variant="ghost" size="sm" className="w-full justify-start" onClick={sair}>
          <LogOut className="size-4" />
          Sair
        </Button>
      </div>
    </div>
  );
}

function NavItem({
  to,
  icon: Icon,
  label,
  onNavigate,
}: {
  to:
    | "/dashboard"
    | "/chat"
    | "/ferramentas/calendario"
    | "/ferramentas/ideias"
    | "/ferramentas/roteiros"
    | "/ferramentas/conteudos";
  icon: typeof CalendarDays;
  label: string;
  onNavigate: () => void;
}) {
  return (
    <Link
      to={to}
      onClick={onNavigate}
      activeProps={{ className: "bg-sidebar-accent text-sidebar-accent-foreground" }}
      className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-sidebar-accent/60 hover:text-foreground"
    >
      <Icon className="size-4" />
      {label}
    </Link>
  );
}

function SubItem({
  to,
  id,
  label,
  onNavigate,
}: {
  to:
    | "/clientes/$clienteId"
    | "/clientes/$clienteId/estrategia"
    | "/clientes/$clienteId/calendario"
    | "/clientes/$clienteId/conteudos"
    | "/clientes/$clienteId/informacoes";
  id: string;
  label: string;
  onNavigate: () => void;
}) {
  return (
    <Link
      to={to}
      params={{ clienteId: id }}
      activeOptions={{ exact: true }}
      activeProps={{ className: "text-primary" }}
      onClick={onNavigate}
      className="block rounded-md px-2 py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
    >
      {label}
    </Link>
  );
}
