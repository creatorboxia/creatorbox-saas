import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

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

export const getPerfil = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) =>
    unwrap(
      await context.supabase
        .from("profiles")
        .select("id, nome, email, plano, status_assinatura")
        .eq("id", context.userId)
        .maybeSingle(),
    ),
  );

/* --------------------------------- clientes -------------------------------- */

export const listClientes = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) =>
    unwrap(
      await context.supabase
        .from("clientes")
        .select("*")
        .order("created_at", { ascending: false }),
    ),
  );

export const getCliente = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string }) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) =>
    unwrap(await context.supabase.from("clientes").select("*").eq("id", data.id).maybeSingle()),
  );

export const createCliente = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
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
  .middleware([requireSupabaseAuth])
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
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string }) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("clientes").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* -------------------------------- conteudos -------------------------------- */

export const listConteudos = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { clienteId?: string | null }) =>
    z.object({ clienteId: z.string().uuid().nullable().optional() }).parse(data),
  )
  .handler(async ({ data, context }) => {
    let query = context.supabase
      .from("conteudos")
      .select("*")
      .order("data_planejada", { ascending: true, nullsFirst: false });
    if (data.clienteId) query = query.eq("cliente_id", data.clienteId);
    return unwrap(await query);
  });

export const saveConteudo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: ConteudoInput & { id?: string }) =>
    conteudoSchema.extend({ id: z.string().uuid().optional() }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const { id, ...rest } = data;
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
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string }) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("conteudos").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* -------------------------------- dashboard -------------------------------- */

export const getDashboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
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
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) =>
    unwrap(
      await context.supabase
        .from("conversas")
        .select("id, titulo, cliente_id, created_at")
        .order("created_at", { ascending: false }),
    ),
  );

export const createConversa = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { titulo?: string; clienteId?: string | null }) =>
    z
      .object({
        titulo: z.string().optional(),
        clienteId: z.string().uuid().nullable().optional(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) =>
    unwrap(
      await context.supabase
        .from("conversas")
        .insert({
          titulo: data.titulo?.trim() || "Nova conversa",
          cliente_id: data.clienteId ?? null,
          user_id: context.userId,
        })
        .select("id, titulo, cliente_id, created_at")
        .single(),
    ),
  );

export const listMensagens = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
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

// Fase atual: a resposta do assistente é simulada — sem IA conectada ainda.
export const sendMensagem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { conversaId: string; conteudo: string }) =>
    z
      .object({ conversaId: z.string().uuid(), conteudo: z.string().min(1) })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    unwrap(
      await context.supabase
        .from("mensagens")
        .insert({ conversa_id: data.conversaId, role: "user", conteudo: data.conteudo })
        .select("id")
        .single(),
    );

    const resposta =
      "Ainda estou em modo de demonstração: a inteligência artificial será conectada em uma próxima fase. " +
      "Enquanto isso, use os campos do cliente (posicionamento, dores, desejos e tom de comunicação) como base " +
      "para montar as ideias e registre-as em Conteúdos.";

    unwrap(
      await context.supabase
        .from("mensagens")
        .insert({ conversa_id: data.conversaId, role: "assistant", conteudo: resposta })
        .select("id")
        .single(),
    );

    return { ok: true };
  });
