import { createHmac, timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import { getStripeWebhookSecret } from "@/lib/stripe";

function parseStripeSignature(signature: string) {
  const parts = signature.split(",").map((part) => part.trim());
  const map = new Map<string, string>();

  for (const part of parts) {
    const [key, value] = part.split("=");
    if (key && value) map.set(key, value);
  }

  return {
    timestamp: map.get("t"),
    v1: map.get("v1"),
  };
}

function verifyStripeSignature(payload: string, signatureHeader: string, secret: string) {
  const { timestamp, v1 } = parseStripeSignature(signatureHeader);
  if (!timestamp || !v1) return false;

  const signedPayload = `${timestamp}.${payload}`;
  const expected = createHmac("sha256", secret).update(signedPayload, "utf8").digest("hex");

  const expectedBuffer = Buffer.from(expected);
  const receivedBuffer = Buffer.from(v1);
  if (expectedBuffer.length !== receivedBuffer.length) return false;

  return timingSafeEqual(expectedBuffer, receivedBuffer);
}

async function handleSubscriptionCheckoutCompleted(customerId: string, email: string | null) {
  // TODO: Integrar com Prisma/Supabase:
  // Exemplo Prisma: await prisma.user.update({ where: { email }, data: { stripeCustomerId: customerId } })
  console.log("[stripe] assinatura concluída", { customerId, email });
}

export async function POST(req: Request) {
  try {
    const payload = await req.text();
    const signatureHeader = req.headers.get("stripe-signature");

    if (!signatureHeader) {
      return NextResponse.json({ error: "Missing stripe-signature" }, { status: 400 });
    }

    const webhookSecret = getStripeWebhookSecret();
    const isValidSignature = verifyStripeSignature(payload, signatureHeader, webhookSecret);

    if (!isValidSignature) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    const event = JSON.parse(payload);

    if (event.type === "checkout.session.completed") {
      const session = event.data?.object;

      if (session?.mode === "subscription") {
        const customerId = String(session.customer || "");
        const email = session.customer_details?.email || session.customer_email || null;

        if (customerId) {
          await handleSubscriptionCheckoutCompleted(customerId, email);
        }
      }
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Webhook handler failed" }, { status: 500 });
  }
}
