import AsyncStorage from "@react-native-async-storage/async-storage";
import { SubscriptionPlan, SubscriptionState, SubscriptionStatus } from "../types/subscription";
import {
  addDays,
  resolveSubscriptionState,
  StoredSubscription
} from "../utils/subscriptionState";
import { activateCloudMonthly, activateCloudYearly, loadCloudSubscription } from "./cloud/subscription";
import { getSessionUser } from "./session";

const STORAGE_KEY = "@kachai/subscription";

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
  const user = await getSessionUser();
  if (user) {
    try {
      return await loadCloudSubscription(user);
    } catch (error) {
      if (__DEV__) console.warn("[KachAI] cloud subscription fallback to local", error);
    }
  }

  const stored = await readStored();

  if (!stored.trialStartedAt) {
    stored.trialStartedAt = new Date().toISOString();
    await writeStored(stored);
  }

  return resolveSubscriptionState(stored);
}

export async function activateMonthlyPlan(): Promise<SubscriptionState> {
  const user = await getSessionUser();
  if (user) {
    try {
      return await activateCloudMonthly(user);
    } catch (error) {
      if (__DEV__) console.warn("[KachAI] cloud monthly activate failed", error);
    }
  }

  const stored = await readStored();
  const next: StoredSubscription = {
    ...stored,
    plan: "monthly",
    subscriptionExpiresAt: addDays(new Date(), 30).toISOString()
  };

  await writeStored(next);
  return resolveSubscriptionState(next);
}

export async function activateYearlyPlan(): Promise<SubscriptionState> {
  const user = await getSessionUser();
  if (user) {
    try {
      return await activateCloudYearly(user);
    } catch (error) {
      if (__DEV__) console.warn("[KachAI] cloud yearly activate failed", error);
    }
  }

  const stored = await readStored();
  const next: StoredSubscription = {
    ...stored,
    plan: "yearly",
    subscriptionExpiresAt: addDays(new Date(), 365).toISOString()
  };

  await writeStored(next);
  return resolveSubscriptionState(next);
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

export type { SubscriptionPlan };
