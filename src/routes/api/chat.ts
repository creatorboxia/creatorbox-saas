import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

import type { Database } from "@/integrations/supabase/types";
import {
  EXTERNAL_SUPABASE_PUBLISHABLE_KEY,
  EXTERNAL_SUPABASE_URL,
  createSupabaseFetch,
} from "@/integrations/external/config";

// Endpoint de chat com IA: valida o JWT do usuário no Supabase externo,
// checa ownership do cliente/conversa, gera a resposta com IA e salva
// as mensagens e o consumo de tokens em uso_ia.

const bodySchema = z.object({
  conversaId: z.string().uuid().nullable().optional(),
  clienteId: z.string().uuid().nullable().optional(),
  mensagem: z.string().min(1, "Mensagem obrigatória"),
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          // 1. Valida o JWT do usuário
          const authHeader = request.headers.get("authorization");
          if (!authHeader?.startsWith("Bearer ")) {
            return json({ error: "Token de autenticação não informado" }, 401);
          }
          const token = authHeader.replace("Bearer ", "");

          const supabase = createClient<Database>(
            EXTERNAL_SUPABASE_URL,
            EXTERNAL_SUPABASE_PUBLISHABLE_KEY,
            {
              global: {
                fetch: createSupabaseFetch(EXTERNAL_SUPABASE_PUBLISHABLE_KEY),
                headers: { Authorization: `Bearer ${token}` },
              },
              auth: { persistSession: false, autoRefreshToken: false },
            },
          );

          const { data: userData, error: userError } = await supabase.auth.getUser(token);
          if (userError || !userData.user) {
            return json({ error: "Token inválido ou expirado" }, 401);
          }
          const userId = userData.user.id;

          // 2. Valida o payload
          const parsed = bodySchema.safeParse(await request.json());
          if (!parsed.success) {
            return json({ error: "Payload inválido: mensagem é obrigatória" }, 400);
          }
          const { conversaId, clienteId, mensagem } = parsed.data;

          // 3. Checa ownership do cliente (quando informado) e monta o contexto
          let contexto = "";
          if (clienteId) {
            const { data: cliente, error: clienteError } = await supabase
              .from("clientes")
              .select("*")
              .eq("id", clienteId)
              .eq("user_id", userId)
              .maybeSingle();
            if (clienteError) return json({ error: clienteError.message }, 500);
            if (!cliente) {
              return json({ error: "Cliente não encontrado ou sem permissão" }, 403);
            }
            const campos: [string, string | null][] = [
              ["Cliente", cliente.nome],
              ["Nicho", cliente.nicho],
              ["Instagram", cliente.instagram],
              ["Cidade", cliente.cidade],
              ["Serviço/produto", cliente.servico_produto],
              ["Público-alvo", cliente.publico_alvo],
              ["Faixa etária", cliente.faixa_etaria],
              ["Perfil do consumidor", cliente.perfil_consumidor],
              ["Dores", cliente.dores],
              ["Desejos", cliente.desejos],
              ["Necessidades", cliente.necessidades],
              ["Objetivo do cliente", cliente.objetivo_cliente],
              ["Objetivo nas redes", cliente.objetivo_redes_sociais],
              ["Posicionamento", cliente.posicionamento],
              ["Diferenciais", cliente.diferenciais],
              ["Tom de comunicação", cliente.tom_comunicacao],
            ];
            contexto = campos
              .filter(([, v]) => v && v.trim() !== "")
              .map(([r, v]) => `${r}: ${v}`)
              .join("\n");
          }

          // 4. Busca (ou cria) a conversa, garantindo ownership
          let conversaIdFinal = conversaId ?? null;
          if (conversaIdFinal) {
            const { data: conversa } = await supabase
              .from("conversas")
              .select("id")
              .eq("id", conversaIdFinal)
              .eq("user_id", userId)
              .maybeSingle();
            if (!conversa) {
              return json({ error: "Conversa não encontrada ou sem permissão" }, 403);
            }
          } else {
            const { data: nova, error: novaError } = await supabase
              .from("conversas")
              .insert({
                titulo: mensagem.trim().slice(0, 60),
                cliente_id: clienteId ?? null,
                user_id: userId,
              })
              .select("id")
              .single();
            if (novaError) return json({ error: novaError.message }, 500);
            conversaIdFinal = nova.id;
          }

          // 5. Salva a mensagem do usuário
          const { error: msgError } = await supabase.from("mensagens").insert({
            conversa_id: conversaIdFinal,
            role: "user",
            conteudo: mensagem.trim(),
          });
          if (msgError) return json({ error: msgError.message }, 500);

          // 6. Histórico para contexto da IA
          const { data: historico } = await supabase
            .from("mensagens")
            .select("role, conteudo")
            .eq("conversa_id", conversaIdFinal)
            .order("created_at", { ascending: true });

          // 7. Gera a resposta com IA
          const apiKey = process.env["LOVABLE_API_KEY"];
          if (!apiKey) {
            return json({ error: "A inteligência artificial não está configurada." }, 500);
          }

          const system =
            "Você é o assistente do CreatorBox, especialista em social media e conteúdo para Instagram. " +
            "Responda sempre em português do Brasil, com ideias práticas e aplicáveis: pautas, roteiros, " +
            "legendas e CTAs. Seja direto e use listas quando ajudar." +
            (contexto ? `\n\nContexto do cliente atendido:\n${contexto}` : "");

          const aiResponse = await fetch(
            "https://ai.gateway.lovable.dev/v1/chat/completions",
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${apiKey}`,
              },
              body: JSON.stringify({
                model: "google/gemini-2.5-flash",
                messages: [
                  { role: "system", content: system },
                  ...(historico ?? []).slice(-20).map((m) => ({
                    role: m.role,
                    content: m.conteudo,
                  })),
                ],
              }),
            },
          );

          if (!aiResponse.ok) {
            if (aiResponse.status === 429) {
              return json(
                { error: "Muitas mensagens em pouco tempo. Aguarde e tente de novo." },
                429,
              );
            }
            if (aiResponse.status === 402) {
              return json(
                { error: "Os créditos de inteligência artificial acabaram." },
                402,
              );
            }
            return json({ error: `Falha na IA (${aiResponse.status})` }, 502);
          }

          const payload = (await aiResponse.json()) as {
            choices?: { message?: { content?: string } }[];
            usage?: { prompt_tokens?: number; completion_tokens?: number };
          };
          const resposta =
            payload.choices?.[0]?.message?.content?.trim() ||
            "Não consegui gerar uma resposta agora. Tente reformular sua pergunta.";

          // 8. Salva a resposta do assistente
          await supabase.from("mensagens").insert({
            conversa_id: conversaIdFinal,
            role: "assistant",
            conteudo: resposta,
          });

          // 9. Registra o consumo de tokens (não interrompe o chat se a tabela não existir)
          await supabase
            .from("uso_ia")
            .insert({
              user_id: userId,
              cliente_id: clienteId ?? null,
              tokens_input: payload.usage?.prompt_tokens ?? 0,
              tokens_output: payload.usage?.completion_tokens ?? 0,
            })
            .then(() => undefined, () => undefined);

          return json({ conversaId: conversaIdFinal, resposta });
        } catch (error) {
          return json({ error: (error as Error).message }, 500);
        }
      },
    },
  },
});
