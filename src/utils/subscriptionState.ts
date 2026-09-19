import { TRIAL_DAYS } from "../constants/subscription";
import type { SubscriptionPlan, SubscriptionState } from "../types/subscription";

export type StoredSubscription = {
  trialStartedAt: string | null;
  plan: SubscriptionPlan;
  subscriptionExpiresAt: string | null;
};

export function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function resolveSubscriptionState(
  data: StoredSubscription,
  now = new Date()
): SubscriptionState {
  const subscriptionExpiresAt = data.subscriptionExpiresAt;
  const hasActiveSub =
    subscriptionExpiresAt != null && new Date(subscriptionExpiresAt).getTime() > now.getTime();

  if (hasActiveSub) {
    return {
      status: "active",
      plan: data.plan,
      trialStartedAt: data.trialStartedAt,
      trialEndsAt: data.trialStartedAt
        ? addDays(new Date(data.trialStartedAt), TRIAL_DAYS).toISOString()
        : null,
      subscriptionExpiresAt
    };
  }

  const trialStartedAt = data.trialStartedAt;
  const trialEndsAt = trialStartedAt
    ? addDays(new Date(trialStartedAt), TRIAL_DAYS).toISOString()
    : null;

  const hasTrial = trialEndsAt != null && new Date(trialEndsAt).getTime() > now.getTime();

  if (hasTrial) {
    return {
      status: "trial",
      plan: "none",
      trialStartedAt,
      trialEndsAt,
      subscriptionExpiresAt: null
    };
  }

  return {
    status: "expired",
    plan: "none",
    trialStartedAt,
    trialEndsAt,
    subscriptionExpiresAt
  };
}
