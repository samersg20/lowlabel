import { NextResponse } from "next/server";
import { STRIPE_PRICE_ID, getAppBaseUrl, getStripeSecretKey } from "@/lib/stripe";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const customPriceId = typeof body.priceId === "string" ? body.priceId.trim() : "";
    const priceId = customPriceId || STRIPE_PRICE_ID;

    if (!priceId.startsWith("price_")) {
      return NextResponse.json({ error: "priceId inválido" }, { status: 400 });
    }

    const origin = new URL(req.url).origin;
    const baseUrl = getAppBaseUrl(origin);
    const successUrl = `${baseUrl}/billing/success?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${baseUrl}/billing/cancel`;

    const params = new URLSearchParams();
    params.set("mode", "subscription");
    params.set("success_url", successUrl);
    params.set("cancel_url", cancelUrl);
    params.set("line_items[0][price]", priceId);
    params.set("line_items[0][quantity]", "1");
    params.set("metadata[productId]", "prod_U2ekv7C4TkDdfl");

    const stripeRes = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${getStripeSecretKey()}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });

    const data = await stripeRes.json();

    if (!stripeRes.ok) {
      return NextResponse.json({ error: data?.error?.message || "Falha ao criar checkout" }, { status: 400 });
    }

    return NextResponse.json({ sessionId: data.id, url: data.url });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Erro inesperado no checkout" }, { status: 500 });
  }
}
