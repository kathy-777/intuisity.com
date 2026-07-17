export type SubscriptionPlan = {
  id: string;
  name: string;
  price: string;
  features: string[];
};

export const premiumPlan: SubscriptionPlan = {
  id: "premium-monthly",
  name: "Intuisity Premium",
  price: "$9.99/mo",
  features: [
    "Unlimited remote viewing sessions",
    "Friend challenge tournaments",
    "Advanced intuition score trends",
    "AI purpose coach prompts"
  ]
};

export async function createStripeCheckoutSession(planId: string) {
  return {
    planId,
    checkoutUrl: "https://checkout.stripe.com/c/pay/mock-intuisity-session"
  };
}
