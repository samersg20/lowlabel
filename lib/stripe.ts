export const STRIPE_PRICE_ID = process.env.STRIPE_PRICE_ID || "price_1T4ZR7FxINTwObzGkJuHJQEV";

function requireEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing environment variable: ${name}`);
  return value;
}

export function getStripeSecretKey() {
  return requireEnv("STRIPE_SECRET_KEY");
}

export function getStripePublishableKey() {
  return requireEnv("NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY");
}

export function getStripeWebhookSecret() {
  return requireEnv("STRIPE_WEBHOOK_SECRET");
}

export function getAppBaseUrl(fallbackOrigin?: string) {
  return process.env.NEXT_PUBLIC_APP_URL || fallbackOrigin || "http://localhost:3000";
}
