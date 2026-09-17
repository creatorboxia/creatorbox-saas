import { createServerFn } from "@tanstack/react-start";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import { requireExternalAuth } from "@/integrations/external/auth-middleware";
import type { Database } from "@/integrations/supabase/types";

type SupabaseClientType = SupabaseClient<Database>;

export type Cliente = Database["public"]["Tables"]["clientes"]["Row"];
export type Conteudo = Database["public"]["Tables"]["conteudos"]["Row"];

const texto = () => z.string().nullable().default(null);

const clienteSchema = z.object({
  nome: z.string().min(1, "Informe o nome do cliente"),
  nicho: texto(),
  instagram: texto(),
  cidade: texto(),
  servico_produto: texto(),
  publico_alvo: texto(),
  faixa_etaria: texto(),
  perfil_consumidor: texto(),
  dores: texto(),
  desejos: texto(),
  necessidades: texto(),
  objetivo_cliente: texto(),
  objetivo_redes_sociais: texto(),
  posicionamento: texto(),
  diferenciais: texto(),
  tom_comunicacao: texto(),
  ativo: z.boolean().default(true),
});
export type ClienteInput = z.input<typeof clienteSchema>;

const conteudoSchema = z.object({
  cliente_id: z.string().uuid(),
  tipo: z.enum(["reel", "carrossel", "story", "post"]),
  categoria: texto(),
  titulo: z.string().min(1, "Informe o título"),
  ideia: texto(),
  roteiro: texto(),
  legenda: texto(),
  cta: texto(),
  status: z.enum(["ideia", "planejado", "produzido", "publicado"]),
  data_planejada: texto(),
});
export type ConteudoInput = z.input<typeof conteudoSchema>;

function unwrap<T>(result: { data: T | null; error: { message: string } | null }): T {
  if (result.error) throw new Error(result.error.message);
  return result.data as T;
}

/* ---------------------------------- perfil --------------------------------- */

export type Perfil = {
  id: string;
  nome: string | null;
  email: string | null;
  plano: string;
  status_assinatura: string;
  avatar_url?: string | null;
  saldo_creditos?: number | null;
};

// Custo fixo por mensagem enviada ao assistente. Ajustável em um único lugar.
export const CUSTO_CREDITOS_MENSAGEM = 10;

export const getPerfil = createServerFn({ method: "GET" })
  .middleware([requireExternalAuth])
  .handler(async ({ context }): Promise<Perfil | null> => {
    const { data, error } = await (context.supabase as SupabaseClient)
      .from("profiles")
      .select("*")
      .eq("id", context.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return (data as Perfil | null) ?? null;
  });

export const updatePerfil = createServerFn({ method: "POST" })
  .middleware([requireExternalAuth])
  .inputValidator((data: { nome?: string | null; avatar_url?: string | null }) =>
    z
      .object({
        nome: z.string().max(120).nullable().optional(),
        avatar_url: z.string().url().nullable().optional(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }): Promise<Perfil> => {
    const payload: Record<string, unknown> = {};
    if (data.nome !== undefined) payload["nome"] = data.nome?.trim() || null;
    if (data.avatar_url !== undefined) payload["avatar_url"] = data.avatar_url;

    const { data: perfil, error } = await (context.supabase as SupabaseClient)
      .from("profiles")
      .update(payload)
      .eq("id", context.userId)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return perfil as Perfil;
  });

/* --------------------------------- clientes -------------------------------- */

export const listClientes = createServerFn({ method: "GET" })
  .middleware([requireExternalAuth])
  .handler(async ({ context }): Promise<Cliente[]> =>
    unwrap(
      await context.supabase
        .from("clientes")
        .select("*")
        .order("created_at", { ascending: false }),
    ),
  );

export const getCliente = createServerFn({ method: "GET" })
  .middleware([requireExternalAuth])
  .inputValidator((data: { id: string }) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }): Promise<Cliente | null> =>
    unwrap(await context.supabase.from("clientes").select("*").eq("id", data.id).maybeSingle()),
  );

export const createCliente = createServerFn({ method: "POST" })
  .middleware([requireExternalAuth])
  .inputValidator((data: ClienteInput) => clienteSchema.parse(data))
  .handler(async ({ data, context }) =>
    unwrap(
      await context.supabase
        .from("clientes")
        .insert({ ...data, user_id: context.userId })
        .select("id")
        .single(),
    ),
  );

export const updateCliente = createServerFn({ method: "POST" })
  .middleware([requireExternalAuth])
  .inputValidator((data: ClienteInput & { id: string }) =>
    clienteSchema.extend({ id: z.string().uuid() }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const { id, ...rest } = data;
    return unwrap(
      await context.supabase.from("clientes").update(rest).eq("id", id).select("id").single(),
    );
  });

export const deleteCliente = createServerFn({ method: "POST" })
  .middleware([requireExternalAuth])
  .inputValidator((data: { id: string }) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("clientes").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* -------------------------------- conteudos -------------------------------- */

export const listConteudos = createServerFn({ method: "GET" })
  .middleware([requireExternalAuth])
  .inputValidator((data: { clienteId?: string | null }) =>
    z.object({ clienteId: z.string().uuid().nullable().optional() }).parse(data),
  )
  .handler(async ({ data, context }): Promise<Conteudo[]> => {
    let query = context.supabase
      .from("conteudos")
      .select("*")
      .order("data_planejada", { ascending: true, nullsFirst: false });
    if (data.clienteId) query = query.eq("cliente_id", data.clienteId);
    return unwrap(await query);
  });

async function assertClienteOwnership(
  supabase: SupabaseClientType,
  clienteId: string,
  userId: string,
) {
  const { data, error } = await supabase
    .from("clientes")
    .select("id")
    .eq("id", clienteId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) throw new Error("Cliente não encontrado ou sem permissão");
}

export const saveConteudo = createServerFn({ method: "POST" })
  .middleware([requireExternalAuth])
  .inputValidator((data: ConteudoInput & { id?: string }) =>
    conteudoSchema.extend({ id: z.string().uuid().optional() }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const { id, ...rest } = data;

    // Garante que o cliente_id informado pertence a este usuário,
    // tanto na criação quanto na edição.
    await assertClienteOwnership(context.supabase, rest.cliente_id, context.userId);

    const payload = { ...rest, data_planejada: rest.data_planejada || null };
    if (id) {
      return unwrap(
        await context.supabase.from("conteudos").update(payload).eq("id", id).select("id").single(),
      );
    }
    return unwrap(
      await context.supabase
        .from("conteudos")
        .insert({ ...payload, user_id: context.userId })
        .select("id")
        .single(),
    );
  });

export const deleteConteudo = createServerFn({ method: "POST" })
  .middleware([requireExternalAuth])
  .inputValidator((data: { id: string }) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("conteudos").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* -------------------------------- dashboard -------------------------------- */

export const getDashboard = createServerFn({ method: "GET" })
  .middleware([requireExternalAuth])
  .handler(async ({ context }) => {
    const clientes = unwrap(
      await context.supabase
        .from("clientes")
        .select("id, nome, nicho, instagram, ativo, created_at")
        .order("created_at", { ascending: false }),
    );
    const conteudos = unwrap(
      await context.supabase
        .from("conteudos")
        .select("id, titulo, tipo, status, data_planejada, cliente_id")
        .order("data_planejada", { ascending: true, nullsFirst: false }),
    );

    return {
      totalClientes: clientes.length,
      clientesAtivos: clientes.filter((c) => c.ativo).length,
      planejados: conteudos.filter((c) => c.status === "planejado").length,
      publicados: conteudos.filter((c) => c.status === "publicado").length,
      ideias: conteudos.filter((c) => c.status === "ideia").length,
      clientesRecentes: clientes.slice(0, 5),
      proximosConteudos: conteudos.filter((c) => c.data_planejada).slice(0, 6),
    };
  });

/* ---------------------------------- chat ---------------------------------- */

export const listConversas = createServerFn({ method: "GET" })
  .middleware([requireExternalAuth])
  .handler(async ({ context }) =>
    unwrap(
      await context.supabase
        .from("conversas")
        .select("id, titulo, cliente_id, created_at")
        .order("created_at", { ascending: false }),
    ),
  );

export const createConversa = createServerFn({ method: "POST" })
  .middleware([requireExternalAuth])
  .inputValidator((data: { titulo?: string; clienteId?: string | null }) =>
    z
      .object({
        titulo: z.string().optional(),
        clienteId: z.string().uuid().nullable().optional(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    // Só valida ownership se um cliente foi de fato informado
    // (clienteId é opcional: chat geral não tem cliente vinculado).
    if (data.clienteId) {
      await assertClienteOwnership(context.supabase, data.clienteId, context.userId);
    }

    return unwrap(
      await context.supabase
        .from("conversas")
        .insert({
          titulo: data.titulo?.trim() || "Nova conversa",
          cliente_id: data.clienteId ?? null,
          user_id: context.userId,
        })
        .select("id, titulo, cliente_id, created_at")
        .single(),
    );
  });

export const listMensagens = createServerFn({ method: "GET" })
  .middleware([requireExternalAuth])
  .inputValidator((data: { conversaId: string }) =>
    z.object({ conversaId: z.string().uuid() }).parse(data),
  )
  .handler(async ({ data, context }) =>
    unwrap(
      await context.supabase
        .from("mensagens")
        .select("id, role, conteudo, created_at")
        .eq("conversa_id", data.conversaId)
        .order("created_at", { ascending: true }),
    ),
  );

async function montarContextoCliente(
  supabase: SupabaseClientType,
  clienteId: string | null,
): Promise<string> {
  if (!clienteId) return "";
  const { data } = await supabase.from("clientes").select("*").eq("id", clienteId).maybeSingle();
  if (!data) return "";
  const campos: [string, string | null][] = [
    ["Cliente", data.nome],
    ["Nicho", data.nicho],
    ["Instagram", data.instagram],
    ["Cidade", data.cidade],
    ["Serviço/produto", data.servico_produto],
    ["Público-alvo", data.publico_alvo],
    ["Faixa etária", data.faixa_etaria],
    ["Perfil do consumidor", data.perfil_consumidor],
    ["Dores", data.dores],
    ["Desejos", data.desejos],
    ["Necessidades", data.necessidades],
    ["Objetivo do cliente", data.objetivo_cliente],
    ["Objetivo nas redes", data.objetivo_redes_sociais],
    ["Posicionamento", data.posicionamento],
    ["Diferenciais", data.diferenciais],
    ["Tom de comunicação", data.tom_comunicacao],
  ];
  return campos
    .filter(([, valor]) => valor && valor.trim() !== "")
    .map(([rotulo, valor]) => `${rotulo}: ${valor}`)
    .join("\n");
}

export const sendMensagem = createServerFn({ method: "POST" })
  .middleware([requireExternalAuth])
  .inputValidator((data: { conversaId: string; conteudo: string }) =>
    z
      .object({ conversaId: z.string().uuid(), conteudo: z.string().min(1) })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const conversa = unwrap<{ id: string; cliente_id: string | null } | null>(
      await context.supabase
        .from("conversas")
        .select("id, cliente_id")
        .eq("id", data.conversaId)
        .maybeSingle(),
    );
    if (!conversa) throw new Error("Conversa não encontrada ou sem permissão");

    unwrap(
      await context.supabase
        .from("mensagens")
        .insert({ conversa_id: data.conversaId, role: "user", conteudo: data.conteudo })
        .select("id")
        .single(),
    );

    const historico = unwrap(
      await context.supabase
        .from("mensagens")
        .select("role, conteudo")
        .eq("conversa_id", data.conversaId)
        .order("created_at", { ascending: true }),
    );

    const contexto = await montarContextoCliente(context.supabase, conversa.cliente_id);

    // Saldo de créditos: lido com client privilegiado para não depender do client do usuário.
    const { externalSupabaseAdmin } = await import("@/integrations/external/client.server");
    const { data: perfilSaldo, error: erroSaldo } = await externalSupabaseAdmin
      .from("profiles")
      .select("saldo_creditos")
      .eq("id", context.userId)
      .maybeSingle();
    if (erroSaldo) throw new Error(erroSaldo.message);

    const saldo = Number((perfilSaldo as { saldo_creditos?: number } | null)?.saldo_creditos ?? 0);
    if (saldo < CUSTO_CREDITOS_MENSAGEM) {
      throw new Error("Créditos insuficientes. Compre mais créditos para continuar.");
    }

    const apiKey = process.env["OPENAI_API_KEY"];

    if (!apiKey) {
      throw new Error("A inteligência artificial não está configurada.");
    }

    const system =
      "Você é o assistente do CreatorBox, especialista em social media e conteúdo para Instagram. " +
      "Responda sempre em português do Brasil, com ideias práticas e aplicáveis: pautas, roteiros, " +
      "legendas e CTAs. Seja direto e use listas quando ajudar." +
      (contexto ? `\n\nContexto do cliente atendido:\n${contexto}` : "");

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-5.4-mini",
        messages: [
          { role: "system", content: system },
          ...historico.slice(-20).map((m) => ({
            role: m.role,
            content: m.conteudo,
          })),
        ],
      }),
    });

    if (!response.ok) {
      const detalhe = await response.text();
      if (response.status === 429) {
        throw new Error("Muitas mensagens em pouco tempo. Aguarde alguns segundos e tente de novo.");
      }
      if (response.status === 402) {
        throw new Error("Os créditos de inteligência artificial acabaram. Adicione créditos para continuar.");
      }
      throw new Error(`Falha na resposta da IA (${response.status}): ${detalhe.slice(0, 200)}`);
    }

    const payload = (await response.json()) as {
      choices?: { message?: { content?: string } }[];
      usage?: { prompt_tokens?: number; completion_tokens?: number };
    };
    const resposta =
      payload.choices?.[0]?.message?.content?.trim() ||
      "Não consegui gerar uma resposta agora. Tente reformular sua pergunta.";

    unwrap(
      await context.supabase
        .from("mensagens")
        .insert({ conversa_id: data.conversaId, role: "assistant", conteudo: resposta })
        .select("id")
        .single(),
    );

    // Registro de uso com client privilegiado (service role): impede que o usuário
    // forje seus próprios dados de consumo. Se a tabela não existir, não interrompe o chat.
    await externalSupabaseAdmin
      .from("uso_ia")
      .insert({
        user_id: context.userId,
        cliente_id: conversa.cliente_id,
        tokens_input: payload.usage?.prompt_tokens ?? 0,
        tokens_output: payload.usage?.completion_tokens ?? 0,
      })
      .then(() => undefined, () => undefined);

    // Desconto dos créditos e registro da transação (service role).
    const { error: erroDebito } = await externalSupabaseAdmin.rpc("incrementar_creditos", {
      p_user_id: context.userId,
      p_quantidade: -CUSTO_CREDITOS_MENSAGEM,
    });
    if (erroDebito) console.error("[Creditos] Falha ao debitar:", erroDebito.message);

    await externalSupabaseAdmin
      .from("transacoes")
      .insert({
        user_id: context.userId,
        tipo: "usage",
        quantidade_creditos: -CUSTO_CREDITOS_MENSAGEM,
        descricao: "Mensagem do assistente de IA",
      })
      .then(() => undefined, () => undefined);

    return { ok: true, resposta, creditosRestantes: saldo - CUSTO_CREDITOS_MENSAGEM };
  });

/* --------------------------------- créditos -------------------------------- */

export type ProdutoCredito = {
  id: string;
  nome: string;
  preco: number;
  quantidade_creditos: number;
  ativo: boolean;
};

export const listProdutosCreditos = createServerFn({ method: "GET" })
  .middleware([requireExternalAuth])
  .handler(async (): Promise<ProdutoCredito[]> => {
    const { externalSupabaseAdmin } = await import("@/integrations/external/client.server");
    const { data, error } = await externalSupabaseAdmin
      .from("produtos_creditos")
      .select("*")
      .eq("ativo", true)
      .order("quantidade_creditos", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []) as unknown as ProdutoCredito[];
  });

export const criarCheckout = createServerFn({ method: "POST" })
  .middleware([requireExternalAuth])
  .inputValidator((data: { produtoId: string }) =>
    z.object({ produtoId: z.string().min(1) }).parse(data),
  )
  .handler(async ({ data, context }): Promise<{ url: string }> => {
    const accessToken = process.env["MERCADOPAGO_ACCESS_TOKEN"];
    if (!accessToken) {
      throw new Error("O pagamento ainda não está configurado. Tente novamente mais tarde.");
    }
    const appUrl = (process.env["APP_URL"] ?? "").replace(/\/$/, "");

    const { externalSupabaseAdmin } = await import("@/integrations/external/client.server");
    const { data: produto, error } = await externalSupabaseAdmin
      .from("produtos_creditos")
      .select("*")
      .eq("id", data.produtoId)
      .eq("ativo", true)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!produto) throw new Error("Pacote de créditos não encontrado.");

    const p = produto as unknown as ProdutoCredito;

    const response = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        items: [
          {
            id: p.id,
            title: p.nome,
            description: `${p.quantidade_creditos} créditos CreatorBox`,
            quantity: 1,
            currency_id: "BRL",
            unit_price: Number(p.preco),
          },
        ],
        external_reference: `${context.userId}:${p.id}`,
        metadata: { user_id: context.userId, produto_id: p.id },
        ...(appUrl
          ? {
              back_urls: {
                success: `${appUrl}/creditos`,
                pending: `${appUrl}/creditos`,
                failure: `${appUrl}/creditos`,
              },
              auto_return: "approved",
              notification_url: `${appUrl}/api/webhooks/mercadopago`,
            }
          : {}),
      }),
    });

    if (!response.ok) {
      const detalhe = await response.text();
      console.error("[MercadoPago] Falha ao criar preferência:", response.status, detalhe);
      throw new Error("Não foi possível abrir o checkout agora. Tente novamente.");
    }

    const preference = (await response.json()) as { init_point?: string; sandbox_init_point?: string };
    const url = preference.init_point ?? preference.sandbox_init_point;
    if (!url) throw new Error("O checkout não retornou um link de pagamento.");
    return { url };
  });
