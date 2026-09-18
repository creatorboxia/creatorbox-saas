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
// checa ownership do cliente/conversa, verifica e desconta créditos,
// gera a resposta com IA e salva as mensagens, o consumo de tokens e a
// transação de uso.

// Custo fixo por mensagem enviada ao assistente. Mesmo valor usado em
// creatorbox.functions.ts — ajustar nos dois lugares se mudar.
const CUSTO_CREDITOS_MENSAGEM = 10;

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

          // Client privilegiado (service role): usado só para as operações
          // que não podem depender do client do próprio usuário — saldo de
          // créditos, registro de uso e transações. Nunca usado para ler
          // dados de negócio do usuário (isso continua no client acima,
          // que respeita RLS).
          const { externalSupabaseAdmin } = await import(
            "@/integrations/external/client.server"
          );

          // 3. Verifica saldo de créditos ANTES de gastar tokens com a IA
          const { data: perfil, error: perfilError } = await externalSupabaseAdmin
            .from("profiles")
            .select("saldo_creditos")
            .eq("id", userId)
            .maybeSingle();
          if (perfilError) return json({ error: perfilError.message }, 500);

          const saldoAtual = Number(
            (perfil as { saldo_creditos?: number } | null)?.saldo_creditos ?? 0,
          );
          if (saldoAtual < CUSTO_CREDITOS_MENSAGEM) {
            return json(
              { error: "Créditos insuficientes. Compre mais créditos para continuar." },
              402,
            );
          }

          // 4. Checa ownership do cliente (quando informado) e monta o contexto
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

          // 5. Busca (ou cria) a conversa, garantindo ownership
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

          // 6. Salva a mensagem do usuário
          const { error: msgError } = await supabase.from("mensagens").insert({
            conversa_id: conversaIdFinal,
            role: "user",
            conteudo: mensagem.trim(),
          });
          if (msgError) return json({ error: msgError.message }, 500);

          // 7. Histórico para contexto da IA
          const { data: historico } = await supabase
            .from("mensagens")
            .select("role, conteudo")
            .eq("conversa_id", conversaIdFinal)
            .order("created_at", { ascending: true });

          // 8. Gera a resposta com IA (OpenAI própria do usuário)
          const apiKey = process.env["OPENAI_API_KEY"];
          if (!apiKey) {
            return json({ error: "A inteligência artificial não está configurada." }, 500);
          }

          const system =
            "Você é o assistente do CreatorBox, especialista em social media e conteúdo para Instagram. " +
            "Responda sempre em português do Brasil, com ideias práticas e aplicáveis: pautas, roteiros, " +
            "legendas e CTAs. Seja direto e use listas quando ajudar." +
            (contexto ? `\n\nContexto do cliente atendido:\n${contexto}` : "");

          const aiResponse = await fetch(
            "https://api.openai.com/v1/chat/completions",
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${apiKey}`,
              },
              body: JSON.stringify({
                model: "gpt-5.4-mini",
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
                {
                  error:
                    "Limite da sua conta OpenAI atingido (muitas mensagens ou saldo esgotado). Verifique seu faturamento na OpenAI.",
                },
                429,
              );
            }
            if (aiResponse.status === 401) {
              return json(
                { error: "A chave da OpenAI é inválida ou foi revogada." },
                401,
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

          // 9. Salva a resposta do assistente
          await supabase.from("mensagens").insert({
            conversa_id: conversaIdFinal,
            role: "assistant",
            conteudo: resposta,
          });

          // 10. Registra o consumo de tokens (client privilegiado — nunca o
          // do usuário, para impedir que ele forje seus próprios dados de
          // consumo). Não interrompe o chat se falhar.
          await externalSupabaseAdmin
            .from("uso_ia")
            .insert({
              user_id: userId,
              cliente_id: clienteId ?? null,
              tokens_input: payload.usage?.prompt_tokens ?? 0,
              tokens_output: payload.usage?.completion_tokens ?? 0,
            })
            .then(() => undefined, () => undefined);

          // 11. Desconta os créditos e registra a transação de uso
          // (client privilegiado, mesma lógica usada no restante do app).
          const { error: erroDebito } = await externalSupabaseAdmin.rpc(
            "incrementar_creditos",
            { p_user_id: userId, p_quantidade: -CUSTO_CREDITOS_MENSAGEM },
          );
          if (erroDebito) {
            console.error("[Creditos] Falha ao debitar:", erroDebito.message);
          }

          await externalSupabaseAdmin
            .from("transacoes")
            .insert({
              user_id: userId,
              tipo: "usage",
              quantidade_creditos: -CUSTO_CREDITOS_MENSAGEM,
              descricao: "Mensagem do assistente de IA",
            })
            .then(() => undefined, () => undefined);

          return json({
            conversaId: conversaIdFinal,
            resposta,
            creditosRestantes: saldoAtual - CUSTO_CREDITOS_MENSAGEM,
          });
        } catch (error) {
          return json({ error: (error as Error).message }, 500);
        }
      },
    },
  },
});
