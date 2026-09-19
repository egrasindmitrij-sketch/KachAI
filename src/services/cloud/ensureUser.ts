import { TRIAL_DAYS } from "../../constants/subscription";
import { addDays } from "../../utils/subscriptionState";
import { getSupabaseClient } from "../supabase";
import { SessionUser } from "../session";

/**
 * Гарантирует строки public.users + public.subscriptions.
 * Нужно если миграция накатана после регистрации или триггер не сработал.
 */
export async function ensureCloudUser(user: SessionUser): Promise<void> {
  const supabase = getSupabaseClient();
  if (!supabase) return;

  const { data: profile, error: profileError } = await supabase
    .from("users")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    throw new Error(profileError.message);
  }

  if (!profile) {
    const { error } = await supabase.from("users").insert({
      id: user.id,
      email: user.email,
      display_name: "Бро Качок"
    });
    if (error && !error.message.toLowerCase().includes("duplicate")) {
      throw new Error(error.message);
    }
  }

  const { data: subscription, error: subscriptionError } = await supabase
    .from("subscriptions")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (subscriptionError) {
    throw new Error(subscriptionError.message);
  }

  if (!subscription) {
    const trialEnd = addDays(new Date(), TRIAL_DAYS).toISOString();
    const { error } = await supabase.from("subscriptions").insert({
      user_id: user.id,
      status: "trial",
      trial_end: trialEnd,
      access_until: trialEnd
    });
    if (error && !error.message.toLowerCase().includes("duplicate")) {
      throw new Error(error.message);
    }
  }
}
