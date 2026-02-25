"use client";

import { useMemo, useState } from "react";

declare global {
  interface Window {
    Stripe?: (publishableKey: string) => {
      redirectToCheckout: (options: { sessionId: string }) => Promise<{ error?: { message?: string } }>;
    };
  }
}

type Props = {
  priceId?: string;
  children?: string;
};

function ensureStripeJsLoaded() {
  return new Promise<void>((resolve, reject) => {
    if (window.Stripe) {
      resolve();
      return;
    }

    const existing = document.querySelector('script[src="https://js.stripe.com/v3"]') as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("Falha ao carregar Stripe.js")), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = "https://js.stripe.com/v3";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Falha ao carregar Stripe.js"));
    document.body.appendChild(script);
  });
}

export function SubscribeButton({ priceId, children = "Assinar mensalidade" }: Props) {
  const publishableKey = useMemo(() => process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "", []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function onSubscribe() {
    setLoading(true);
    setError("");

    try {
      if (!publishableKey) {
        throw new Error("NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY não configurada");
      }

      await ensureStripeJsLoaded();

      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceId }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.sessionId) {
        throw new Error(data.error || "Não foi possível iniciar o checkout");
      }

      const stripe = window.Stripe?.(publishableKey);
      if (!stripe) throw new Error("Stripe.js indisponível");

      const result = await stripe.redirectToCheckout({ sessionId: data.sessionId });
      if (result?.error?.message) throw new Error(result.error.message);
    } catch (e: any) {
      setError(e.message || "Falha ao redirecionar para o checkout");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button type="button" className="secondary" onClick={onSubscribe} disabled={loading}>
        {loading ? "Abrindo checkout..." : children}
      </button>
      {error && <p style={{ marginTop: 6, color: "#b00020", fontSize: 14 }}>{error}</p>}
    </>
  );
}
