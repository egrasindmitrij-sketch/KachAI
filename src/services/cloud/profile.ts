import { UserProfile } from "../../types/profile";
import { getSupabaseClient } from "../supabase";
import { SessionUser } from "../session";
import { ensureCloudUser } from "./ensureUser";
import { ProfileRow } from "./types";

const DEFAULT_NAME = "Бро Качок";

export async function loadCloudProfile(user: SessionUser): Promise<UserProfile> {
  const supabase = getSupabaseClient();
  if (!supabase) return { displayName: DEFAULT_NAME };

  await ensureCloudUser(user);

  const { data, error } = await supabase
    .from("users")
    .select("id, email, display_name")
    .eq("id", user.id)
    .maybeSingle();

  if (error) throw new Error(error.message);

  const row = data as ProfileRow | null;
  return {
    displayName: row?.display_name?.trim() || DEFAULT_NAME
  };
}

export async function saveCloudProfile(user: SessionUser, profile: UserProfile): Promise<void> {
  const supabase = getSupabaseClient();
  if (!supabase) return;

  await ensureCloudUser(user);

  const { error } = await supabase
    .from("users")
    .update({ display_name: profile.displayName.trim() || DEFAULT_NAME })
    .eq("id", user.id);

  if (error) throw new Error(error.message);
}
