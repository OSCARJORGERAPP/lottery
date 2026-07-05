import Stripe from "stripe";

// Lazy: no instanciar en el top-level (next build evalúa módulos sin env vars)
let _stripe: Stripe | undefined;

export function getStripe(): Stripe {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error("STRIPE_SECRET_KEY no configurado");
    _stripe = new Stripe(key);
  }
  return _stripe;
}
