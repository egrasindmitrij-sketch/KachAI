export type SubscriptionStatus = "trial" | "active" | "expired";

export type SubscriptionPlan = "none" | "monthly" | "yearly";

export type SubscriptionState = {
  status: SubscriptionStatus;
  plan: SubscriptionPlan;
  trialStartedAt: string | null;
  trialEndsAt: string | null;
  subscriptionExpiresAt: string | null;
};

export type PurchaseResult = {
  success: boolean;
  paymentId: string;
  message?: string;
};
