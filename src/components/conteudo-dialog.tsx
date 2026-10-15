import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

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
import { ConteudoAnexos } from "@/components/conteudo-anexos";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  deleteConteudo,
  saveConteudo,
  type Conteudo,
  type Prioridade,
} from "@/lib/creatorbox.functions";

export type ConteudoForm = {
  cliente_id: string;
  tipo: "reel" | "carrossel" | "story" | "post";
  status: "ideia" | "planejado" | "produzido" | "publicado";
  titulo: string;
  categoria: string;
  ideia: string;
  roteiro: string;
  legenda: string;
  cta: string;
  data_planejada: string;
  prioridade: "" | Prioridade;
};

export const prioridadeLabel: Record<Prioridade, string> = {
  baixa: "Baixa",
  media: "Média",
  alta: "Alta",
};

export const statusLabel: Record<ConteudoForm["status"], string> = {
  ideia: "Ideia",
  planejado: "Planejado",
  produzido: "Produzido",
  publicado: "Publicado",
};

function paraForm(
  c: Conteudo | null,
  clienteId: string,
  padrao?: Partial<ConteudoForm>,
): ConteudoForm {
  if (!c)
    return {
      cliente_id: clienteId,
      tipo: "reel",
      status: "ideia",
      titulo: "",
      categoria: "",
      ideia: "",
      roteiro: "",
      legenda: "",
      cta: "",
      data_planejada: "",
      prioridade: "",
      ...padrao,
    };
  return {
    cliente_id: c.cliente_id,
    tipo: c.tipo as ConteudoForm["tipo"],
    status: c.status as ConteudoForm["status"],
    titulo: c.titulo,
    categoria: c.categoria ?? "",
    ideia: c.ideia ?? "",
    roteiro: c.roteiro ?? "",
    legenda: c.legenda ?? "",
    cta: c.cta ?? "",
    data_planejada: c.data_planejada ?? "",
    prioridade: c.prioridade ?? "",
  };
}

/**
 * Diálogo único para criar, editar e excluir conteúdos.
 * `clienteFixo` trava o cliente (área do cliente); sem ele, `clientes` alimenta o seletor.
 */
export function ConteudoDialog({
  open,
  onOpenChange,
  conteudo,
  clienteFixo,
  clientes,
  padrao,
  comPrioridade = false,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conteudo: Conteudo | null;
  clienteFixo?: string;
  clientes?: { id: string; nome: string }[];
  padrao?: Partial<ConteudoForm>;
  /** Mostra e grava o campo de prioridade (usado na aba Ideias). Fora dela, a prioridade é preservada. */
  comPrioridade?: boolean;
}) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<ConteudoForm>(() =>
    paraForm(conteudo, clienteFixo ?? "", padrao),
  );
  const [confirmar, setConfirmar] = useState(false);

  useEffect(() => {
    if (open) setForm(paraForm(conteudo, clienteFixo ?? "", padrao));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, conteudo, clienteFixo]);

  const invalidar = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ["conteudos"] }),
      queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
    ]);

  const salvar = useMutation({
    mutationFn: () =>
      saveConteudo({
        data: {
          ...(conteudo ? { id: conteudo.id } : {}),
          cliente_id: clienteFixo ?? form.cliente_id,
          tipo: form.tipo,
          status: form.status,
          titulo: form.titulo,
          categoria: form.categoria || null,
          ideia: form.ideia || null,
          roteiro: form.roteiro || null,
          legenda: form.legenda || null,
          cta: form.cta || null,
          data_planejada: form.data_planejada || null,
          ...(comPrioridade ? { prioridade: form.prioridade || null } : {}),
        },
      }),
    onSuccess: async () => {
      await invalidar();
      onOpenChange(false);
      toast.success("Conteúdo salvo.");
    },
    onError: (error: Error) =>
      toast.error("Não foi possível salvar", { description: error.message }),
  });

  const remover = useMutation({
    mutationFn: (id: string) => deleteConteudo({ data: { id } }),
    onSuccess: async () => {
      await invalidar();
      setConfirmar(false);
      onOpenChange(false);
      toast.success("Conteúdo removido.");
    },
    onError: (error: Error) => {
      setConfirmar(false);
      toast.error("Não foi possível remover", { description: error.message });
    },
  });

  const set = <K extends keyof ConteudoForm>(k: K, v: ConteudoForm[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{conteudo ? "Editar conteúdo" : "Novo conteúdo"}</DialogTitle>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (!(clienteFixo ?? form.cliente_id)) {
                toast.error("Escolha o cliente.");
                return;
              }
              if (!form.titulo.trim()) {
                toast.error("Informe o título.");
                return;
              }
              salvar.mutate();
            }}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              {!clienteFixo && (
                <div className="space-y-2 sm:col-span-2">
                  <Label>Cliente</Label>
                  <Select value={form.cliente_id} onValueChange={(v) => set("cliente_id", v)}>
                    <SelectTrigger aria-label="Cliente">
                      <SelectValue placeholder="Escolha o cliente" />
                    </SelectTrigger>
                    <SelectContent>
                      {(clientes ?? []).map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="cd-titulo">Título</Label>
                <Input
                  id="cd-titulo"
                  required
                  value={form.titulo}
                  onChange={(e) => set("titulo", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Formato</Label>
                <Select
                  value={form.tipo}
                  onValueChange={(v) => set("tipo", v as ConteudoForm["tipo"])}
                >
                  <SelectTrigger aria-label="Formato">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="reel">Reel</SelectItem>
                    <SelectItem value="carrossel">Carrossel</SelectItem>
                    <SelectItem value="story">Story</SelectItem>
                    <SelectItem value="post">Post</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={form.status}
                  onValueChange={(v) => set("status", v as ConteudoForm["status"])}
                >
                  <SelectTrigger aria-label="Status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(statusLabel).map(([v, l]) => (
                      <SelectItem key={v} value={v}>
                        {l}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="cd-categoria">Categoria</Label>
                <Input
                  id="cd-categoria"
                  value={form.categoria}
                  placeholder="Educativo, vendas, bastidores..."
                  onChange={(e) => set("categoria", e.target.value)}
                />
              </div>
              {comPrioridade && (
                <div className="space-y-2">
                  <Label>Prioridade</Label>
                  <Select
                    value={form.prioridade || "nenhuma"}
                    onValueChange={(v) =>
                      set("prioridade", v === "nenhuma" ? "" : (v as Prioridade))
                    }
                  >
                    <SelectTrigger aria-label="Prioridade">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="nenhuma">Sem prioridade</SelectItem>
                      {Object.entries(prioridadeLabel).map(([v, l]) => (
                        <SelectItem key={v} value={v}>
                          {l}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="cd-data">Data planejada</Label>
                <Input
                  id="cd-data"
                  type="date"
                  value={form.data_planejada}
                  onChange={(e) => set("data_planejada", e.target.value)}
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="cd-ideia">Ideia</Label>
                <Textarea
                  id="cd-ideia"
                  rows={2}
                  value={form.ideia}
                  onChange={(e) => set("ideia", e.target.value)}
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="cd-roteiro">Roteiro</Label>
                <Textarea
                  id="cd-roteiro"
                  rows={4}
                  value={form.roteiro}
                  onChange={(e) => set("roteiro", e.target.value)}
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="cd-legenda">Legenda</Label>
                <Textarea
                  id="cd-legenda"
                  rows={3}
                  value={form.legenda}
                  onChange={(e) => set("legenda", e.target.value)}
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="cd-cta">Chamada para ação</Label>
                <Input id="cd-cta" value={form.cta} onChange={(e) => set("cta", e.target.value)} />
              </div>
            </div>
            <ConteudoAnexos conteudoId={conteudo?.id ?? null} />
            <div className="flex items-center justify-between gap-2">
              {conteudo ? (
                <Button
                  type="button"
                  variant="ghost"
                  className="text-destructive hover:text-destructive"
                  onClick={() => setConfirmar(true)}
                >
                  <Trash2 className="size-4" />
                  Excluir
                </Button>
              ) : (
                <span />
              )}
              <Button
                type="submit"
                disabled={salvar.isPending || !(clienteFixo ?? form.cliente_id)}
              >
                {salvar.isPending ? "Salvando..." : "Salvar conteúdo"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmar} onOpenChange={setConfirmar}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir este conteúdo?</AlertDialogTitle>
            <AlertDialogDescription>
              "{conteudo?.titulo}" será removido de vez. Essa ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={remover.isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={remover.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(e) => {
                e.preventDefault();
                if (conteudo) remover.mutate(conteudo.id);
              }}
            >
              {remover.isPending ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
