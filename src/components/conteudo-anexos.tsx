import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, ExternalLink, FileText, Film, Loader2, Paperclip, X } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  MAX_ANEXOS,
  TIPOS_ACEITOS,
  enviarAnexo,
  formatarTamanho,
  listarAnexos,
  removerAnexo,
  urlDownload,
  urlsAssinadas,
  validarArquivo,
  type Anexo,
} from "@/lib/anexos";

export function ConteudoAnexos({ conteudoId }: { conteudoId: string | null }) {
  const queryClient = useQueryClient();
  const input = useRef<HTMLInputElement>(null);
  const [envio, setEnvio] = useState<{ feito: number; total: number } | null>(null);

  const chave = ["anexos", conteudoId];
  const { data: anexos, isLoading, error } = useQuery({
    queryKey: chave,
    enabled: !!conteudoId,
    queryFn: async () => {
      const lista = await listarAnexos(conteudoId!);
      const urls = await urlsAssinadas(lista.map((a) => a.caminho)).catch(() => ({}));
      return lista.map((a) => ({ ...a, url: (urls as Record<string, string>)[a.caminho] }));
    },
  });

  const remover = useMutation({
    mutationFn: (a: Anexo) => removerAnexo(a),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: chave });
      toast.success("Anexo removido.");
    },
    onError: (e: Error) => toast.error("Não foi possível remover o anexo", { description: e.message }),
  });

  async function enviar(files: FileList | null) {
    if (!files?.length || !conteudoId) return;
    let atuais = anexos?.length ?? 0;
    const validos: File[] = [];
    for (const f of Array.from(files)) {
      const erro = validarArquivo(f, atuais);
      if (erro) toast.error(f.name, { description: erro });
      else {
        validos.push(f);
        atuais++;
      }
    }
    if (!validos.length) return;
    setEnvio({ feito: 0, total: validos.length });
    let ok = 0;
    for (const f of validos) {
      try {
        await enviarAnexo(conteudoId, f);
        ok++;
      } catch (e) {
        toast.error(`Falha ao enviar ${f.name}`, { description: (e as Error).message });
      }
      setEnvio((s) => (s ? { ...s, feito: s.feito + 1 } : s));
    }
    setEnvio(null);
    await queryClient.invalidateQueries({ queryKey: chave });
    if (ok) toast.success(ok === 1 ? "Arquivo anexado." : `${ok} arquivos anexados.`);
  }

  async function baixar(a: Anexo) {
    try {
      window.location.href = await urlDownload(a.caminho, a.nome);
    } catch (e) {
      toast.error("Não foi possível baixar", { description: (e as Error).message });
    }
  }

  if (!conteudoId) {
    return (
      <section className="space-y-2">
        <h3 className="text-sm font-medium">Arquivos anexados</h3>
        <p className="rounded-lg border border-dashed border-border px-3 py-4 text-center text-xs text-muted-foreground">
          Salve o conteúdo primeiro para anexar arquivos.
        </p>
      </section>
    );
  }

  const cheio = (anexos?.length ?? 0) >= MAX_ANEXOS;

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-medium">Arquivos anexados</h3>
          <p className="text-xs text-muted-foreground">
            JPG, PNG, WebP, MP4, MOV ou PDF · até 50 MB · máx. {MAX_ANEXOS} arquivos
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={!!envio || cheio}
          onClick={() => input.current?.click()}
        >
          <Paperclip className="size-4" />
          Anexar
        </Button>
        <input
          ref={input}
          type="file"
          multiple
          hidden
          accept={Object.keys(TIPOS_ACEITOS).join(",")}
          onChange={(e) => {
            enviar(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      {envio && (
        <div className="space-y-1">
          <Progress value={(envio.feito / envio.total) * 100} />
          <p className="text-xs text-muted-foreground">
            Enviando {Math.min(envio.feito + 1, envio.total)} de {envio.total}...
          </p>
        </div>
      )}

      {isLoading && <p className="text-xs text-muted-foreground">Carregando anexos...</p>}
      {error && (
        <p className="text-xs text-destructive">
          Não foi possível carregar os anexos: {(error as Error).message}
        </p>
      )}

      {!!anexos?.length && (
        <ul className="grid gap-2 sm:grid-cols-2">
          {anexos.map((a) => (
            <li
              key={a.id}
              className="flex items-center gap-3 rounded-lg border border-border bg-card/40 p-2"
            >
              <div className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-md bg-primary/15 text-primary">
                {a.mime_type.startsWith("image/") && a.url ? (
                  <img src={a.url} alt="" className="size-full object-cover" loading="lazy" />
                ) : a.mime_type.startsWith("video/") ? (
                  <Film className="size-5" />
                ) : (
                  <FileText className="size-5" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium" title={a.nome}>
                  {a.nome}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {TIPOS_ACEITOS[a.mime_type] ?? a.mime_type} · {formatarTamanho(a.tamanho)}
                </p>
              </div>
              <div className="flex shrink-0">
                {a.url && (
                  <Button asChild type="button" variant="ghost" size="icon" className="size-8">
                    <a href={a.url} target="_blank" rel="noreferrer" aria-label={`Abrir ${a.nome}`}>
                      <ExternalLink className="size-4" />
                    </a>
                  </Button>
                )}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-8"
                  aria-label={`Baixar ${a.nome}`}
                  onClick={() => baixar(a)}
                >
                  <Download className="size-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-8 text-muted-foreground hover:text-destructive"
                  aria-label={`Remover ${a.nome}`}
                  disabled={remover.isPending}
                  onClick={() => {
                    if (window.confirm(`Remover "${a.nome}"? O arquivo será apagado.`))
                      remover.mutate(a);
                  }}
                >
                  {remover.isPending && remover.variables?.id === a.id ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <X className="size-4" />
                  )}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
