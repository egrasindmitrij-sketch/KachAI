import { makeRedirectUri } from "expo-auth-session";
import * as QueryParams from "expo-auth-session/build/QueryParams";
import { getSupabaseClient } from "./supabase";

export type AuthSessionResult = { ok: true } | { ok: false; error: string };

/** URL, на который Supabase перенаправляет после подтверждения email / OAuth. */
export function getAuthRedirectUri(): string {
  return makeRedirectUri({
    scheme: "kachai",
    path: "auth/callback"
  });
}

export function isAuthCallbackUrl(url: string): boolean {
  const lower = url.toLowerCase();
  return (
    lower.includes("access_token") ||
    lower.includes("refresh_token") ||
    lower.includes("auth/callback") ||
    lower.includes("type=signup") ||
    lower.includes("type=recovery") ||
    lower.includes("type=email_change")
  );
}

/** Создаёт сессию из deep link (подтверждение email, Google OAuth, сброс пароля). */
export async function applySessionFromAuthUrl(url: string): Promise<AuthSessionResult> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return { ok: false, error: "Supabase не настроен в .env" };
  }

  const { params, errorCode } = QueryParams.getQueryParams(url);
  if (errorCode) {
    return { ok: false, error: `Ошибка авторизации: ${errorCode}` };
  }

  const access_token = params.access_token;
  const refresh_token = params.refresh_token;
  if (!access_token || !refresh_token) {
    return { ok: false, error: "В ссылке нет токенов сессии" };
  }

  const { error } = await supabase.auth.setSession({ access_token, refresh_token });
  if (error) {
    return { ok: false, error: error.message };
  }

  const { data } = await supabase.auth.getSession();
  if (!data.session?.user) {
    return { ok: false, error: "Сессия не создана" };
  }

  return { ok: true };
}
