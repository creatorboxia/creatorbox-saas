import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "crypto";

import { getPlano } from "@/lib/planos";

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
  const esperado = Buffer.from(
    createHmac("sha256", segredo).update(`${t}.${corpo}`).digest("hex"),
  );
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

type Assinatura = { id: string; customer: string; status: string; metadata: { plano?: string } };

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
        const { externalSupabaseAdmin: admin } = await import(
          "@/integrations/external/client.server"
        );
        const appUrl = (process.env["APP_URL"] ?? new URL(request.url).origin).replace(/\/$/, "");

        try {
          if (evento.type === "checkout.session.completed") {
            const sessao = evento.data.object as {
              mode?: string;
              customer?: string;
              subscription?: string;
              customer_details?: { email?: string; name?: string };
              metadata?: { plano?: string };
            };
            if (sessao.mode !== "subscription") return new Response("ignorado");
            const email = sessao.customer_details?.email?.toLowerCase();
            const plano = getPlano(sessao.metadata?.plano);
            if (!email || !plano) return new Response("dados incompletos", { status: 400 });

            // Procura o perfil pelo e-mail; se não existir, convida (cria a conta e
            // envia o e-mail de primeiro acesso para definir a senha).
            const { data: existente } = await admin
              .from("profiles")
              .select("id")
              .eq("email", email)
              .maybeSingle();
            let userId = (existente as { id: string } | null)?.id;
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
            const fatura = evento.data.object as {
              billing_reason?: string;
              subscription?: string;
            };
            // Renovação mensal: o saldo volta ao total do plano (não acumula).
            if (fatura.billing_reason === "subscription_cycle" && fatura.subscription) {
              const sub = await stripeGet<Assinatura>(`subscriptions/${fatura.subscription}`, chave);
              const plano = getPlano(sub.metadata?.plano);
              if (plano) {
                await admin
                  .from("profiles")
                  .update({ saldo_creditos: plano.creditos, status_assinatura: "active" })
                  .eq("stripe_subscription_id", sub.id);
              }
            }
          }

          if (
            evento.type === "customer.subscription.updated" ||
            evento.type === "customer.subscription.deleted"
          ) {
            const sub = evento.data.object as unknown as Assinatura;
            const status = evento.type === "customer.subscription.deleted" ? "canceled" : sub.status;
            const plano = getPlano(sub.metadata?.plano);
            await admin
              .from("profiles")
              .update({ status_assinatura: status, ...(plano ? { plano: plano.id } : {}) })
              .eq("stripe_subscription_id", sub.id);
          }
        } catch (e) {
          console.error("[Stripe] Erro ao processar", evento.type, e);
          return new Response("erro", { status: 500 });
        }

        return new Response("ok");
      },
    },
  },
});
