import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { getAppBaseUrl, getStripeSecretKey } from "@/lib/stripe";
import { isStrongPassword } from "@/lib/tenant";

function normalize(input: unknown) {
  return String(input || "").trim();
}

function normalizeCnpj(value: string) {
  return value.replace(/\D/g, "");
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function isValidZipCode(value: string) {
  return /^\d{5}-?\d{3}$/.test(value);
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const name = normalize(body.name);
    const email = normalize(body.email).toLowerCase();
    const password = String(body.password || "");
    const legalName = normalize(body.legalName);
    const tradeName = normalize(body.tradeName);
    const cnpj = normalizeCnpj(normalize(body.cnpj));
    const businessAddress = normalize(body.businessAddress);
    const neighborhood = normalize(body.neighborhood).toUpperCase();
    const city = normalize(body.city);
    const state = normalize(body.state).toUpperCase();
    const zipCode = normalize(body.zipCode);
    const stateRegistration = normalize(body.stateRegistration);
    const printerCount = Math.max(1, Number(body.printerCount || 1));

    if (!name || !email || !password || !legalName || !tradeName || !cnpj || !businessAddress || !neighborhood || !city || !state || !zipCode) {
      return NextResponse.json({ error: "Preencha todos os dados obrigatórios do cadastro" }, { status: 400 });
    }

    if (!isValidEmail(email)) {
      return NextResponse.json({ error: "E-mail inválido" }, { status: 400 });
    }

    if (cnpj.length !== 14) {
      return NextResponse.json({ error: "CNPJ inválido. Informe 14 dígitos" }, { status: 400 });
    }

    if (!isValidZipCode(zipCode)) {
      return NextResponse.json({ error: "CEP inválido. Use o formato 00000-000" }, { status: 400 });
    }

    if (!isStrongPassword(password)) {
      return NextResponse.json({ error: "Senha fraca. Use no mínimo 8 caracteres com letra, número e símbolo." }, { status: 400 });
    }

    const existing = await prisma.user.findFirst({ where: { email } });
    if (existing) return NextResponse.json({ error: "E-mail já cadastrado" }, { status: 409 });

    const passwordHash = await bcrypt.hash(password, 10);

    const created = await prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: {
          companyName: tradeName,
          legalName,
          tradeName,
          cnpj,
          businessAddress,
          neighborhood,
          city,
          state,
          zipCode,
          stateRegistration: stateRegistration || "ISENTO",
          printerLimit: printerCount,
          subscriptionStatus: "pending",
        },
      });

      const user = await tx.user.create({
        data: {
          tenantId: tenant.id,
          name,
          email,
          username: email,
          passwordHash,
          role: "ADMIN",
          unit: neighborhood,
        },
      });

      await tx.unit.create({
        data: {
          tenantId: tenant.id,
          name: neighborhood,
          email,
          phone: "",
          managerName: name,
        },
      });

      await tx.method.createMany({
        data: [
          { tenantId: tenant.id, name: "QUENTE", durationValue: 3, durationUnit: "hours" },
          { tenantId: tenant.id, name: "PISTA FRIA", durationValue: 3, durationUnit: "hours" },
          { tenantId: tenant.id, name: "DESCONGELANDO", durationValue: 3, durationUnit: "days" },
          { tenantId: tenant.id, name: "RESFRIADO", durationValue: 3, durationUnit: "days" },
          { tenantId: tenant.id, name: "CONGELADO", durationValue: 30, durationUnit: "days" },
          { tenantId: tenant.id, name: "AMBIENTE", durationValue: 30, durationUnit: "days" },
        ],
      });

      return { tenant, user };
    });

    const origin = new URL(req.url).origin;
    const baseUrl = getAppBaseUrl(origin);
    const successUrl = `${baseUrl}/billing/success?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${baseUrl}/billing/cancel`;

    const params = new URLSearchParams();
    params.set("mode", "subscription");
    params.set("success_url", successUrl);
    params.set("cancel_url", cancelUrl);
    params.set("line_items[0][price]", process.env.STRIPE_PRICE_ID || "price_1T4ZR7FxINTwObzGkJuHJQEV");
    params.set("line_items[0][quantity]", String(printerCount));
    params.set("customer_email", email);
    params.set("metadata[tenantId]", created.tenant.id);
    params.set("metadata[userId]", created.user.id);
    params.set("metadata[printerLimit]", String(printerCount));
    params.set("metadata[productId]", process.env.STRIPE_PRODUCT_ID || "prod_U2ekv7C4TkDdfl");

    const stripeRes = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${getStripeSecretKey()}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });

    const stripeData = await stripeRes.json();

    if (!stripeRes.ok || !stripeData.id) {
      return NextResponse.json({ error: stripeData?.error?.message || "Não foi possível criar checkout" }, { status: 400 });
    }

    return NextResponse.json({
      ok: true,
      sessionId: stripeData.id,
      checkoutUrl: stripeData.url,
      tenantId: created.tenant.id,
    }, { status: 201 });
  } catch (error: any) {
    const isUnique = error?.code === "P2002";
    if (isUnique) {
      return NextResponse.json({ error: "Dados já cadastrados (e-mail/CNPJ)" }, { status: 409 });
    }
    return NextResponse.json({ error: error?.message || "Não foi possível realizar o cadastro" }, { status: 500 });
  }
}
