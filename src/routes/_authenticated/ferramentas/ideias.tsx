import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Lightbulb, Pencil, Star, Plus, Search, Trash2, X } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { ConteudoDialog, prioridadeLabel } from "@/components/conteudo-dialog";
import { useClientes, FiltroCliente } from "@/components/filtro-cliente";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  deleteConteudo,
  listConteudos,
  setFavoritoConteudo,
  type Conteudo,
  type Prioridade,
} from "@/lib/creatorbox.functions";

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

const prioridadeVariant: Record<Prioridade, "default" | "secondary" | "outline"> = {
  alta: "default",
  media: "secondary",
  baixa: "outline",
};

const normalizar = (t: string) =>
  t
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

function Ideias() {
  const queryClient = useQueryClient();
  const [filtro, setFiltro] = useState("todos");
  const [formato, setFormato] = useState("todos");
  const [categoria, setCategoria] = useState("todas");
  const [busca, setBusca] = useState("");
  const [prioridade, setPrioridade] = useState("todas");
  const [soFavoritos, setSoFavoritos] = useState(false);
  const [aberto, setAberto] = useState(false);
  const [editando, setEditando] = useState<Conteudo | null>(null);
  const [excluir, setExcluir] = useState<Conteudo | null>(null);

  const { data: clientes } = useClientes();
  const {
    data: conteudos,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["conteudos", "geral"],
    queryFn: () => listConteudos({ data: {} }),
  });

  const remover = useMutation({
    mutationFn: (id: string) => deleteConteudo({ data: { id } }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["conteudos"] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
      ]);
      setExcluir(null);
      toast.success("Ideia removida.");
    },
    onError: (e: Error) => {
      setExcluir(null);
      toast.error("Não foi possível remover", { description: e.message });
    },
  });

  const favoritar = useMutation({
    mutationFn: (v: { id: string; favorito: boolean }) => setFavoritoConteudo({ data: v }),
    onMutate: async (v) => {
      const chave = ["conteudos", "geral"];
      await queryClient.cancelQueries({ queryKey: chave });
      const anterior = queryClient.getQueryData<Conteudo[]>(chave);
      queryClient.setQueryData<Conteudo[]>(chave, (lista) =>
        lista?.map((c) => (c.id === v.id ? { ...c, favorito: v.favorito } : c)),
      );
      return { anterior };
    },
    onError: (e: Error, _v, ctx) => {
      if (ctx?.anterior) queryClient.setQueryData(["conteudos", "geral"], ctx.anterior);
      toast.error("Não foi possível atualizar o favorito", { description: e.message });
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["conteudos"] }),
  });

  const nomeCliente = (id: string) => clientes?.find((c) => c.id === id)?.nome ?? "Cliente";

  const todasIdeias = useMemo(
    () => (conteudos ?? []).filter((c) => c.status === "ideia"),
    [conteudos],
  );

  const categorias = useMemo(
    () =>
      Array.from(
        new Set(todasIdeias.map((c) => c.categoria?.trim()).filter((c): c is string => !!c)),
      ).sort((a, b) => a.localeCompare(b, "pt-BR")),
    [todasIdeias],
  );

  const termo = normalizar(busca);
  const ideias = todasIdeias.filter(
    (c) =>
      (filtro === "todos" || c.cliente_id === filtro) &&
      (formato === "todos" || c.tipo === formato) &&
      (categoria === "todas" || c.categoria?.trim() === categoria) &&
      (prioridade === "todas" ||
        (prioridade === "nenhuma" ? !c.prioridade : c.prioridade === prioridade)) &&
      (!soFavoritos || c.favorito === true) &&
      (!termo || normalizar(`${c.titulo} ${c.ideia ?? ""}`).includes(termo)),
  );

  const filtrosAtivos =
    filtro !== "todos" ||
    formato !== "todos" ||
    categoria !== "todas" ||
    prioridade !== "todas" ||
    soFavoritos ||
    busca !== "";

  const limpar = () => {
    setFiltro("todos");
    setFormato("todos");
    setCategoria("todas");
    setBusca("");
    setPrioridade("todas");
    setSoFavoritos(false);
  };

  const novaIdeia = () => {
    setEditando(null);
    setAberto(true);
  };

  const semClientes = clientes?.length === 0;

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Ideias</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Banco de ideias ainda não planejadas, de todos os clientes.
          </p>
        </div>
        <Button size="sm" onClick={novaIdeia} disabled={semClientes}>
          <Plus className="size-4" />
          Criar ideia
        </Button>
      </div>

      <ConteudoDialog
        open={aberto}
        onOpenChange={(o) => {
          setAberto(o);
          if (!o) setEditando(null);
        }}
        conteudo={editando}
        clientes={clientes ?? []}
        comPrioridade
        padrao={{ status: "ideia", cliente_id: filtro !== "todos" ? filtro : "" }}
      />

      {todasIdeias.length > 0 && (
        <div className="mt-6 flex flex-wrap items-center gap-2">
          <div className="relative min-w-56 flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por título ou descrição"
              aria-label="Buscar ideias"
              className="pl-9"
            />
          </div>
          <FiltroCliente valor={filtro} onChange={setFiltro} />
          <Select value={formato} onValueChange={setFormato}>
            <SelectTrigger className="w-40" aria-label="Filtrar por formato">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os formatos</SelectItem>
              {Object.entries(tipoLabel).map(([v, l]) => (
                <SelectItem key={v} value={v}>
                  {l}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={categoria} onValueChange={setCategoria}>
            <SelectTrigger className="w-44" aria-label="Filtrar por categoria">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas as categorias</SelectItem>
              {categorias.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={prioridade} onValueChange={setPrioridade}>
            <SelectTrigger className="w-44" aria-label="Filtrar por prioridade">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas as prioridades</SelectItem>
              {Object.entries(prioridadeLabel).map(([v, l]) => (
                <SelectItem key={v} value={v}>
                  {l}
                </SelectItem>
              ))}
              <SelectItem value="nenhuma">Sem prioridade</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant={soFavoritos ? "secondary" : "outline"}
            size="sm"
            aria-pressed={soFavoritos}
            onClick={() => setSoFavoritos((v) => !v)}
          >
            <Star className={soFavoritos ? "size-4 fill-primary text-primary" : "size-4"} />
            Favoritas
          </Button>
          {filtrosAtivos && (
            <Button variant="ghost" size="sm" onClick={limpar}>
              <X className="size-4" />
              Limpar filtros
            </Button>
          )}
        </div>
      )}

      {isLoading ? (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-32 animate-pulse rounded-2xl border border-border bg-card/40"
            />
          ))}
        </div>
      ) : isError ? (
        <div className="mt-10 rounded-2xl border border-destructive/40 p-8 text-center">
          <p className="text-sm text-muted-foreground">
            Não foi possível carregar as ideias. {(error as Error)?.message}
          </p>
          <Button variant="outline" size="sm" className="mt-4" onClick={() => refetch()}>
            Tentar novamente
          </Button>
        </div>
      ) : todasIdeias.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-dashed border-border px-6 py-12 text-center">
          <Lightbulb className="mx-auto size-8 text-primary" />
          <h2 className="mt-4 font-medium">Seu banco de ideias está vazio</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            Guarde aqui ideias de conteúdo para seus clientes antes de planejá-las. Quando uma ideia
            ganhar data, ela passa para o calendário.
          </p>
          <Button className="mt-6" onClick={novaIdeia} disabled={semClientes}>
            <Plus className="size-4" />
            Criar ideia
          </Button>
          {semClientes && (
            <p className="mt-3 text-xs text-muted-foreground">
              Cadastre um cliente primeiro para criar ideias.
            </p>
          )}
        </div>
      ) : ideias.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-dashed border-border p-10 text-center">
          <p className="text-sm text-muted-foreground">
            Nenhuma ideia encontrada com esses filtros.
          </p>
          <Button variant="outline" size="sm" className="mt-4" onClick={limpar}>
            Limpar filtros
          </Button>
        </div>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {ideias.map((ideia) => (
            <div
              key={ideia.id}
              className="group flex flex-col rounded-2xl border border-border bg-card/40 p-5 transition-colors hover:border-primary/50"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <Badge variant="secondary">{tipoLabel[ideia.tipo] ?? ideia.tipo}</Badge>
                  {ideia.prioridade && (
                    <Badge variant={prioridadeVariant[ideia.prioridade]}>
                      {prioridadeLabel[ideia.prioridade]}
                    </Badge>
                  )}
                </div>
                <div className="flex min-w-0 items-center gap-1">
                  <span className="truncate text-xs text-muted-foreground">
                    {nomeCliente(ideia.cliente_id)}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7"
                    aria-label={ideia.favorito ? "Desfavoritar ideia" : "Favoritar ideia"}
                    aria-pressed={!!ideia.favorito}
                    disabled={favoritar.isPending && favoritar.variables?.id === ideia.id}
                    onClick={() => favoritar.mutate({ id: ideia.id, favorito: !ideia.favorito })}
                  >
                    <Star
                      className={ideia.favorito ? "size-4 fill-primary text-primary" : "size-4"}
                    />
                  </Button>
                </div>
              </div>
              <p className="mt-3 font-medium">{ideia.titulo}</p>
              {ideia.ideia && (
                <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">{ideia.ideia}</p>
              )}
              <div className="mt-auto flex items-center justify-between gap-2 pt-4">
                <span className="truncate text-xs text-muted-foreground">
                  {ideia.categoria ? `Categoria: ${ideia.categoria}` : ""}
                </span>
                <div className="flex shrink-0 gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Editar ideia"
                    onClick={() => {
                      setEditando(ideia);
                      setAberto(true);
                    }}
                  >
                    <Pencil className="size-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Excluir ideia"
                    onClick={() => setExcluir(ideia)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <AlertDialog open={!!excluir} onOpenChange={(o) => !o && setExcluir(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir ideia?</AlertDialogTitle>
            <AlertDialogDescription>
              "{excluir?.titulo}" e seus anexos serão removidos. Essa ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={remover.isPending}
              onClick={(e) => {
                e.preventDefault();
                if (excluir) remover.mutate(excluir.id);
              }}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
