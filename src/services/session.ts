import { getSupabaseClient } from "./supabase";

export type SessionUser = {
  id: string;
  email: string | null;
};

/** JWT-пользователь Supabase или null (demo / нет сессии). */
export async function getSessionUser(): Promise<SessionUser | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;

  const { data } = await supabase.auth.getSession();
  const user = data.session?.user;
  if (!user) return null;

  return { id: user.id, email: user.email ?? null };
}

export async function getSessionUserId(): Promise<string | null> {
  const user = await getSessionUser();
  return user?.id ?? null;
}
