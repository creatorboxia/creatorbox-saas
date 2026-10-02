import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { getPlano } from "@/lib/planos";

// Checkout público: qualquer visitante pode assinar. A conta é criada pelo
// webhook do Stripe com o e-mail informado na compra.
export const criarCheckoutAssinatura = createServerFn({ method: "POST" })
  .inputValidator((data: { planoId: string; origem?: string }) =>
    z
      .object({ planoId: z.string().min(1).max(40), origem: z.string().url().optional() })
      .parse(data),
  )
  .handler(async ({ data }): Promise<{ url: string }> => {
    const chave = process.env["STRIPE_SECRET_KEY"];
    if (!chave) {
      throw new Error(
        "As assinaturas ainda não estão abertas. Volte em breve ou fale com o suporte.",
      );
    }
    const plano = getPlano(data.planoId);
    if (!plano) throw new Error("Plano não encontrado.");

    const appUrl = (process.env["APP_URL"] || data.origem || "").replace(/\/$/, "");
    if (!appUrl) throw new Error("Endereço do app não configurado.");

    const body = new URLSearchParams({
      mode: "subscription",
      success_url: `${appUrl}/planos?status=sucesso`,
      cancel_url: `${appUrl}/planos?status=cancelado`,
      "line_items[0][quantity]": "1",
      "line_items[0][price_data][currency]": "brl",
      "line_items[0][price_data][unit_amount]": String(plano.precoCentavos),
      "line_items[0][price_data][recurring][interval]": "month",
      "line_items[0][price_data][product_data][name]": `CreatorBox ${plano.nome}`,
      "line_items[0][price_data][product_data][description]": `${plano.creditos} créditos por mês`,
      "metadata[plano]": plano.id,
      "subscription_data[metadata][plano]": plano.id,
      billing_address_collection: "auto",
      locale: "pt-BR",
    });

    const resposta = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${chave}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    });
    if (!resposta.ok) {
      console.error("[Stripe] Falha ao criar checkout:", resposta.status, await resposta.text());
      throw new Error("Não foi possível abrir o pagamento agora. Tente novamente.");
    }
    const sessao = (await resposta.json()) as { url?: string };
    if (!sessao.url) throw new Error("O pagamento não retornou um link.");
    return { url: sessao.url };
  });
