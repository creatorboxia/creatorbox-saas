import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "crypto";

import { getPlano, getPlanoPorPriceId, type Plano } from "@/lib/planos";
import {
  assinaturaDaFatura,
  decidirEventoExistente,
  escaparLike,
  type Fatura,
  type StatusEvento,
} from "@/lib/stripe-webhook";

function assinaturaValida(corpo: string, header: string | null, segredo: string) {
  if (!header) return false;
  let t = "";
  const v1: string[] = [];
  for (const parte of header.split(",")) {
    const [k, v] = parte.split("=");
    if (k === "t" && v) t = v;
    if (k === "v1" && v) v1.push(v);
  }
  if (!t || v1.length === 0) return false;
  // Tolerância de 5 minutos contra replay.
  if (Math.abs(Date.now() / 1000 - Number(t)) > 300) return false;
  const esperado = Buffer.from(createHmac("sha256", segredo).update(`${t}.${corpo}`).digest("hex"));
  return v1.some((s) => {
    const b = Buffer.from(s);
    return b.length === esperado.length && timingSafeEqual(b, esperado);
  });
}

async function stripeGet<T>(caminho: string, chave: string): Promise<T> {
  const r = await fetch(`https://api.stripe.com/v1/${caminho}`, {
    headers: { Authorization: `Bearer ${chave}` },
  });
  if (!r.ok) throw new Error(`Stripe ${caminho}: ${r.status}`);
  return (await r.json()) as T;
}

type Assinatura = {
  id: string;
  customer: string;
  status: string;
  metadata: { plano?: string };
  items?: { data?: { price?: { id?: string } }[] };
};

// O plano chega pelos metadados da assinatura. Quando eles faltarem — contas
// criadas antes dessa convenção, ou assinaturas editadas no painel do Stripe —
// o Price cobrado no item ainda identifica o plano.
function priceIdDaAssinatura(sub: Assinatura) {
  return sub.items?.data?.[0]?.price?.id;
}

function planoDaAssinatura(sub: Assinatura): Plano | undefined {
  return getPlano(sub.metadata?.plano) ?? getPlanoPorPriceId(priceIdDaAssinatura(sub));
}

export const Route = createFileRoute("/api/public/webhooks/stripe")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const chave = process.env["STRIPE_SECRET_KEY"];
        const segredo = process.env["STRIPE_WEBHOOK_SECRET"];
        if (!chave || !segredo) {
          console.error("[Stripe] STRIPE_SECRET_KEY ou STRIPE_WEBHOOK_SECRET não configurados.");
          return new Response("Stripe não configurado", { status: 503 });
        }

        const corpo = await request.text();
        if (!assinaturaValida(corpo, request.headers.get("stripe-signature"), segredo)) {
          return new Response("Assinatura inválida", { status: 401 });
        }

        const evento = JSON.parse(corpo) as {
          id: string;
          type: string;
          data: { object: Record<string, unknown> };
        };
        const { externalSupabaseAdmin: admin } =
          await import("@/integrations/external/client.server");

        // Idempotência com estados: processing → processed | failed.
        // O insert com event_id como chave primária "reserva" o evento de forma
        // atômica, então dois avisos simultâneos não processam em dobro.
        const { error: erroReserva } = await admin
          .from("stripe_processed_events")
          .insert({ event_id: evento.id, tipo: evento.type, status: "processing" });
        if (erroReserva) {
          if (erroReserva.code !== "23505") {
            console.error("[Stripe] Falha ao reservar evento", evento.id, erroReserva);
            return new Response("erro", { status: 500 });
          }
          const { data: reg, error: erroLeitura } = await admin
            .from("stripe_processed_events")
            .select("status, created_at")
            .eq("event_id", evento.id)
            .maybeSingle();
          if (erroLeitura || !reg) {
            console.error("[Stripe] Falha ao ler evento", evento.id, erroLeitura);
            return new Response("erro", { status: 500 });
          }
          const r = reg as { status: string; created_at: string | null };
          const decisao = decidirEventoExistente(r.status, r.created_at);
          if (decisao === "ignorar") return new Response("ok");
          // Outro processamento em andamento: a Stripe tenta de novo depois.
          if (decisao === "aguardar") return new Response("em processamento", { status: 409 });
          // Reprocessa (falhou ou travou): reserva condicional ao estado lido.
          let q = admin
            .from("stripe_processed_events")
            .update({ status: "processing", created_at: new Date().toISOString() })
            .eq("event_id", evento.id)
            .eq("status", r.status);
          if (r.created_at) q = q.eq("created_at", r.created_at);
          const { data: reservado, error: erroRetomada } = await q.select("event_id");
          if (erroRetomada) {
            console.error("[Stripe] Falha ao retomar evento", evento.id, erroRetomada);
            return new Response("erro", { status: 500 });
          }
          if (!reservado || reservado.length === 0) {
            return new Response("em processamento", { status: 409 });
          }
        }

        const marcar = async (status: StatusEvento) => {
          const { error } = await admin
            .from("stripe_processed_events")
            .update({ status })
            .eq("event_id", evento.id);
          if (error) console.error("[Stripe] Falha ao marcar evento", evento.id, status, error);
          return !error;
        };

        const appUrl = (process.env["APP_URL"] ?? new URL(request.url).origin).replace(/\/$/, "");

        // Atualiza perfis pela assinatura e exige que ao menos um seja encontrado.
        const atualizarPorAssinatura = async (subId: string, campos: Record<string, unknown>) => {
          const { data, error } = await admin
            .from("profiles")
            .update(campos)
            .eq("stripe_subscription_id", subId)
            .select("id");
          if (error) throw new Error(error.message);
          if (!data || data.length === 0) {
            throw new Error(`Nenhum perfil com a assinatura ${subId}`);
          }
        };

        try {
          if (evento.type === "checkout.session.completed") {
            const sessao = evento.data.object as {
              mode?: string;
              customer?: string;
              subscription?: string;
              customer_details?: { email?: string; name?: string };
              metadata?: { plano?: string; price_id?: string };
            };
            if (sessao.mode !== "subscription") {
              await marcar("processed");
              return new Response("ignorado");
            }
            const email = sessao.customer_details?.email?.trim().toLowerCase();
            let plano =
              getPlano(sessao.metadata?.plano) ?? getPlanoPorPriceId(sessao.metadata?.price_id);
            // Último recurso: lê o Price direto da assinatura criada pela sessão.
            if (!plano && sessao.subscription) {
              const sub = await stripeGet<Assinatura>(
                `subscriptions/${sessao.subscription}`,
                chave,
              );
              plano = planoDaAssinatura(sub);
            }
            if (!email || !plano) {
              console.error("[Stripe] Checkout sem e-mail ou plano", evento.id);
              await marcar("failed");
              return new Response("dados incompletos", { status: 400 });
            }

            // Procura o perfil pelo e-mail (sem diferenciar maiúsculas); se não
            // existir, convida (cria a conta e envia o e-mail de primeiro acesso).
            const { data: existentes, error: erroBusca } = await admin
              .from("profiles")
              .select("id")
              .ilike("email", escaparLike(email))
              .limit(2);
            if (erroBusca) throw new Error(erroBusca.message);
            if (existentes && existentes.length > 1) {
              throw new Error(`Mais de um perfil com o e-mail da compra (${evento.id})`);
            }
            let userId = (existentes?.[0] as { id: string } | undefined)?.id;
            if (!userId) {
              const { data: convite, error } = await admin.auth.admin.inviteUserByEmail(email, {
                redirectTo: `${appUrl}/reset-password?primeiro=1`,
                data: { nome: sessao.customer_details?.name ?? null },
              });
              if (error || !convite.user) throw new Error(error?.message ?? "Falha no convite");
              userId = convite.user.id;
            }

            const { error: erroPerfil } = await admin.from("profiles").upsert({
              id: userId,
              email,
              plano: plano.id,
              status_assinatura: "active",
              saldo_creditos: plano.creditos,
              stripe_customer_id: sessao.customer ?? null,
              stripe_subscription_id: sessao.subscription ?? null,
            });
            if (erroPerfil) throw new Error(erroPerfil.message);
          }

          if (evento.type === "invoice.paid") {
            const fatura = evento.data.object as Fatura;
            const subId = assinaturaDaFatura(fatura);
            // Renovação mensal: o saldo volta ao total do plano (não acumula).
            if (fatura.billing_reason === "subscription_cycle") {
              if (!subId) throw new Error("Fatura de renovação sem assinatura");
              const sub = await stripeGet<Assinatura>(`subscriptions/${subId}`, chave);
              const plano = planoDaAssinatura(sub);
              if (!plano) throw new Error(`Plano não identificado na assinatura ${sub.id}`);
              await atualizarPorAssinatura(sub.id, {
                saldo_creditos: plano.creditos,
                status_assinatura: "active",
              });
            }
          }

          if (
            evento.type === "customer.subscription.updated" ||
            evento.type === "customer.subscription.deleted"
          ) {
            const sub = evento.data.object as unknown as Assinatura;
            const status =
              evento.type === "customer.subscription.deleted" ? "canceled" : sub.status;
            const plano = planoDaAssinatura(sub);
            await atualizarPorAssinatura(sub.id, {
              status_assinatura: status,
              ...(plano ? { plano: plano.id } : {}),
            });
          }
        } catch (e) {
          console.error("[Stripe] Erro ao processar", evento.type, evento.id, e);
          await marcar("failed");
          return new Response("erro", { status: 500 });
        }

        // Só marca como concluído depois de todas as gravações darem certo.
        if (!(await marcar("processed"))) return new Response("erro", { status: 500 });
        return new Response("ok");
      },
    },
  },
});
