import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Loader2, Plus, Send } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/external/client";
import {
  createConversa,
  listConversas,
  listMensagens,
} from "@/lib/creatorbox.functions";

// Envia a mensagem para o endpoint /api/chat, que valida o JWT,
// checa o ownership do cliente, gera a resposta com IA e registra
// as mensagens e o consumo de tokens em uso_ia.
async function enviarParaApiChat(params: {
  conversaId: string | null;
  clienteId?: string | null;
  mensagem: string;
}): Promise<{ conversaId: string; resposta: string }> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Sessão expirada. Entre novamente.");

  const response = await fetch("/api/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      conversaId: params.conversaId,
      clienteId: params.clienteId ?? null,
      mensagem: params.mensagem,
    }),
  });

  const payload = (await response.json().catch(() => ({}))) as {
    conversaId?: string;
    resposta?: string;
    error?: string;
  };
  if (!response.ok) throw new Error(payload.error || "Falha ao enviar a mensagem");
  if (!payload.conversaId) throw new Error("Resposta inválida do servidor");
  return { conversaId: payload.conversaId, resposta: payload.resposta ?? "" };
}

export const Route = createFileRoute("/_authenticated/chat")({
  head: () => ({
    meta: [
      { title: "Chat de ideias — CreatorBox" },
      {
        name: "description",
        content: "Converse sobre pautas, roteiros e legendas dos seus clientes no CreatorBox.",
      },
      { property: "og:title", content: "Chat de ideias — CreatorBox" },
      {
        property: "og:description",
        content: "Converse sobre pautas, roteiros e legendas dos seus clientes no CreatorBox.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Chat,
});

function Chat() {
  const queryClient = useQueryClient();
  const [conversaId, setConversaId] = useState<string | null>(null);
  const [texto, setTexto] = useState("");
  const fim = useRef<HTMLDivElement>(null);

  const { data: conversas } = useQuery({
    queryKey: ["conversas"],
    queryFn: () => listConversas(),
  });

  useEffect(() => {
    if (!conversaId && conversas && conversas.length > 0) {
      setConversaId(conversas[0]!.id);
    }
  }, [conversas, conversaId]);

  const { data: mensagens } = useQuery({
    queryKey: ["mensagens", conversaId],
    queryFn: () => listMensagens({ data: { conversaId: conversaId! } }),
    enabled: Boolean(conversaId),
  });

  useEffect(() => {
    fim.current?.scrollIntoView({ behavior: "smooth" });
  }, [mensagens]);

  const nova = useMutation({
    mutationFn: async () => (await createConversa({ data: {} })) as { id: string } | null,
    onSuccess: async (conversa) => {
      await queryClient.invalidateQueries({ queryKey: ["conversas"] });
      if (conversa) setConversaId(conversa.id);
    },
    onError: (error: Error) => toast.error("Não foi possível criar a conversa", {
      description: error.message,
    }),
  });

  const enviar = useMutation({
    mutationFn: async (conteudo: string) => {
      let id: string | null = conversaId;
      if (!id) {
        const conversa = (await createConversa({ data: {} })) as { id: string } | null;
        id = conversa?.id ?? null;
        if (!id) throw new Error("Não foi possível iniciar a conversa");
        setConversaId(id);
        await queryClient.invalidateQueries({ queryKey: ["conversas"] });
      }
      await sendMensagem({ data: { conversaId: id, conteudo } });
      return id;
    },
    onSuccess: (id) => {
      setTexto("");
      queryClient.invalidateQueries({ queryKey: ["mensagens", id] });
    },
    onError: (error: Error) =>
      toast.error("Não foi possível enviar a mensagem", { description: error.message }),
  });

  return (
    <div className="flex h-full min-h-screen">
      <div className="hidden w-64 shrink-0 border-r border-border px-3 py-6 xl:block">
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={() => nova.mutate()}
          disabled={nova.isPending}
        >
          <Plus className="size-4" />
          Nova conversa
        </Button>
        <div className="mt-4 space-y-1">
          {(conversas ?? []).map((conversa) => (
            <button
              key={conversa.id}
              onClick={() => setConversaId(conversa.id)}
              className={`w-full truncate rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                conversa.id === conversaId
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
              }`}
            >
              {conversa.titulo}
            </button>
          ))}
        </div>
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="border-b border-border px-6 py-4">
          <h1 className="text-lg font-semibold">Chat de ideias</h1>
          <p className="text-xs text-muted-foreground">
            Peça pautas, roteiros e legendas — o assistente usa as informações do cliente.
          </p>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-6 py-6">
          {(mensagens ?? []).length === 0 && (
            <p className="mx-auto max-w-md pt-16 text-center text-sm text-muted-foreground">
              Comece perguntando algo como “me dá 5 ideias de reels para uma clínica de estética”.
            </p>
          )}
          {(mensagens ?? []).map((mensagem) => (
            <div
              key={mensagem.id}
              className={`flex ${mensagem.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-2xl rounded-2xl px-4 py-3 text-sm whitespace-pre-wrap ${
                  mensagem.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "border border-border bg-card"
                }`}
              >
                {mensagem.conteudo}
              </div>
            </div>
          ))}
          {enviar.isPending && (
            <div className="flex justify-start">
              <div className="flex items-center gap-1.5 rounded-2xl border border-border bg-card px-4 py-3.5">
                <span className="size-2 animate-bounce rounded-full bg-primary [animation-delay:-0.3s]" />
                <span className="size-2 animate-bounce rounded-full bg-primary [animation-delay:-0.15s]" />
                <span className="size-2 animate-bounce rounded-full bg-primary" />
              </div>
            </div>
          )}
          <div ref={fim} />
        </div>

        <form
          className="flex items-end gap-2 border-t border-border px-6 py-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (texto.trim() === "") return;
            enviar.mutate(texto.trim());
          }}
        >
          <Textarea
            value={texto}
            rows={2}
            placeholder="Escreva sua ideia ou pergunta..."
            disabled={enviar.isPending}
            onChange={(e) => setTexto(e.target.value)}
            className="resize-none"
          />
          <Button type="submit" disabled={enviar.isPending || texto.trim() === ""}>
            {enviar.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Send className="size-4" />
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
