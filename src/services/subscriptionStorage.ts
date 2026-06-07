import AsyncStorage from "@react-native-async-storage/async-storage";
import { TRIAL_DAYS } from "../constants/subscription";
import { SubscriptionPlan, SubscriptionState, SubscriptionStatus } from "../types/subscription";

const STORAGE_KEY = "@kachai/subscription";

type StoredSubscription = {
  trialStartedAt: string | null;
  plan: SubscriptionPlan;
  subscriptionExpiresAt: string | null;
};

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function resolveStatus(data: StoredSubscription, now = new Date()): SubscriptionState {
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

  const hasTrial =
    trialEndsAt != null && new Date(trialEndsAt).getTime() > now.getTime();

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

async function readStored(): Promise<StoredSubscription> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) {
    const started = new Date().toISOString();
    return {
      trialStartedAt: started,
      plan: "none",
      subscriptionExpiresAt: null
    };
  }

  try {
    return JSON.parse(raw) as StoredSubscription;
  } catch {
    const started = new Date().toISOString();
    return {
      trialStartedAt: started,
      plan: "none",
      subscriptionExpiresAt: null
    };
  }
}

async function writeStored(data: StoredSubscription): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export async function loadSubscriptionState(): Promise<SubscriptionState> {
  const stored = await readStored();

  if (!stored.trialStartedAt) {
    stored.trialStartedAt = new Date().toISOString();
    await writeStored(stored);
  }

  return resolveStatus(stored);
}

export async function activateMonthlyPlan(): Promise<SubscriptionState> {
  const stored = await readStored();
  const expiresAt = addDays(new Date(), 30).toISOString();

  const next: StoredSubscription = {
    ...stored,
    plan: "monthly",
    subscriptionExpiresAt: expiresAt
  };

  await writeStored(next);
  return resolveStatus(next);
}

export async function activateYearlyPlan(): Promise<SubscriptionState> {
  const stored = await readStored();
  const expiresAt = addDays(new Date(), 365).toISOString();

  const next: StoredSubscription = {
    ...stored,
    plan: "yearly",
    subscriptionExpiresAt: expiresAt
  };

  await writeStored(next);
  return resolveStatus(next);
}

export function getAccessUntil(state: SubscriptionState): string | null {
  if (state.status === "active") return state.subscriptionExpiresAt;
  if (state.status === "trial") return state.trialEndsAt;
  return null;
}

export function hasPremiumAccess(state: SubscriptionState): boolean {
  return state.status === "trial" || state.status === "active";
}

export function getStatusLabel(status: SubscriptionStatus): string {
  if (status === "trial") return "Триал";
  if (status === "active") return "Активна";
  return "Просрочена";
}
