import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
} from "@/components/ai-elements/prompt-input";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/external/client";
import { createConversa, listConversas, listMensagens } from "@/lib/creatorbox.functions";

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

  const nova = useMutation({
    mutationFn: async () => (await createConversa({ data: {} })) as { id: string } | null,
    onSuccess: async (conversa) => {
      await queryClient.invalidateQueries({ queryKey: ["conversas"] });
      if (conversa) setConversaId(conversa.id);
    },
    onError: (error: Error) =>
      toast.error("Não foi possível criar a conversa", {
        description: error.message,
      }),
  });

  const enviar = useMutation({
    mutationFn: async (conteudo: string) => {
      const resultado = await enviarParaApiChat({
        conversaId,
        mensagem: conteudo,
      });
      if (resultado.conversaId !== conversaId) {
        setConversaId(resultado.conversaId);
        await queryClient.invalidateQueries({ queryKey: ["conversas"] });
      }
      return resultado.conversaId;
    },
    onSuccess: (id) => {
      setTexto("");
      queryClient.invalidateQueries({ queryKey: ["mensagens", id] });
    },
    onError: (error: Error) =>
      toast.error("Não foi possível enviar a mensagem", { description: error.message }),
  });

  return (
    <div className="flex h-full min-h-0 overflow-hidden">
      <div className="hidden h-full w-64 shrink-0 overflow-y-auto border-r border-border px-3 py-6 xl:block">
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

      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <div className="shrink-0 border-b border-border px-4 py-4 sm:px-6">
          <h1 className="text-lg font-semibold">Chat de ideias</h1>
          <p className="text-xs text-muted-foreground">
            Peça pautas, roteiros e legendas — o assistente usa as informações do cliente.
          </p>
        </div>

        <Conversation className="min-h-0">
          <ConversationContent className="mx-auto w-full max-w-3xl gap-5 px-4 py-6 sm:px-6">
            {(mensagens ?? []).length === 0 && (
              <ConversationEmptyState
                className="min-h-72"
                title="Comece uma nova ideia"
                description="Experimente pedir 5 ideias de reels para uma clínica de estética."
              />
            )}
            {(mensagens ?? []).map((mensagem) => (
              <Message
                key={mensagem.id}
                from={mensagem.role === "user" ? "user" : "assistant"}
                className="max-w-full"
              >
                <MessageContent
                  className={
                    mensagem.role === "user"
                      ? "max-w-[85%] bg-primary text-primary-foreground sm:max-w-2xl"
                      : "w-full max-w-2xl"
                  }
                >
                  {mensagem.role === "assistant" ? (
                    <MessageResponse className="text-sm leading-7 [&_a]:text-primary [&_a]:underline [&_blockquote]:border-l-primary [&_code]:rounded [&_code]:bg-muted [&_code]:px-1.5 [&_code]:py-0.5 [&_h1]:font-display [&_h1]:text-xl [&_h2]:font-display [&_h2]:text-lg [&_h3]:font-display [&_h3]:text-base [&_li]:my-1 [&_pre]:border [&_pre]:border-border [&_pre]:bg-muted/70 [&_strong]:text-foreground">
                      {mensagem.conteudo}
                    </MessageResponse>
                  ) : (
                    <p className="whitespace-pre-wrap">{mensagem.conteudo}</p>
                  )}
                </MessageContent>
              </Message>
            ))}
            {enviar.isPending && (
              <Message from="assistant">
                <MessageContent>
                  <Shimmer className="text-sm">Criando sua resposta...</Shimmer>
                </MessageContent>
              </Message>
            )}
          </ConversationContent>
          <ConversationScrollButton aria-label="Ir para a mensagem mais recente" />
        </Conversation>

        <div className="shrink-0 border-t border-border bg-background px-4 py-3 sm:px-6 sm:py-4">
          <PromptInput
            className="mx-auto max-w-3xl"
            onSubmit={({ text }) => {
              const conteudo = text.trim();
              if (conteudo === "" || enviar.isPending) return;
              enviar.mutate(conteudo);
            }}
          >
            <PromptInputTextarea
              value={texto}
              placeholder="Escreva sua ideia ou pergunta..."
              disabled={enviar.isPending}
              onChange={(event) => setTexto(event.currentTarget.value)}
              className="min-h-20"
            />
            <PromptInputFooter className="justify-end">
              <PromptInputSubmit
                status={enviar.isPending ? "submitted" : "ready"}
                disabled={enviar.isPending || texto.trim() === ""}
                aria-label="Enviar mensagem"
              />
            </PromptInputFooter>
          </PromptInput>
        </div>
      </div>
    </div>
  );
}
