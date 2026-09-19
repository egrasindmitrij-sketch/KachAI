import { TRIAL_DAYS } from "../../constants/subscription";
import { SubscriptionPlan, SubscriptionState } from "../../types/subscription";
import { addDays, resolveSubscriptionState, StoredSubscription } from "../../utils/subscriptionState";
import { getSupabaseClient } from "../supabase";
import { SessionUser } from "../session";
import { ensureCloudUser } from "./ensureUser";
import { SubscriptionRow } from "./types";

function rowToStored(row: SubscriptionRow): StoredSubscription {
  const plan: SubscriptionPlan =
    row.plan === "monthly" || row.plan === "yearly" ? row.plan : "none";

  const trialEndsAt = row.trial_end;
  const trialStartedAt = trialEndsAt
    ? addDays(new Date(trialEndsAt), -TRIAL_DAYS).toISOString()
    : row.created_at;

  const isPaidActive =
    (row.status === "active" || plan !== "none") &&
    row.access_until != null &&
    new Date(row.access_until).getTime() > Date.now();

  return {
    trialStartedAt,
    plan: isPaidActive ? plan : plan === "none" ? "none" : plan,
    subscriptionExpiresAt: isPaidActive || plan !== "none" ? row.access_until : null
  };
}

export async function loadCloudSubscription(user: SessionUser): Promise<SubscriptionState> {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error("Supabase не настроен");

  await ensureCloudUser(user);

  const { data, error } = await supabase
    .from("subscriptions")
    .select("id, user_id, status, plan, trial_end, access_until, created_at, updated_at")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) throw new Error("Подписка не найдена");

  return resolveSubscriptionState(rowToStored(data as SubscriptionRow));
}

async function activateCloudPlan(
  user: SessionUser,
  plan: "monthly" | "yearly",
  days: number
): Promise<SubscriptionState> {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error("Supabase не настроен");

  await ensureCloudUser(user);

  const accessUntil = addDays(new Date(), days).toISOString();
  const { data, error } = await supabase
    .from("subscriptions")
    .update({
      status: "active",
      plan,
      access_until: accessUntil
    })
    .eq("user_id", user.id)
    .select("id, user_id, status, plan, trial_end, access_until, created_at, updated_at")
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) throw new Error("Не удалось обновить подписку");

  return resolveSubscriptionState(rowToStored(data as SubscriptionRow));
}

export async function activateCloudMonthly(user: SessionUser): Promise<SubscriptionState> {
  return activateCloudPlan(user, "monthly", 30);
}

export async function activateCloudYearly(user: SessionUser): Promise<SubscriptionState> {
  return activateCloudPlan(user, "yearly", 365);
}
