import * as WebBrowser from "expo-web-browser";
import { applySessionFromAuthUrl, getAuthRedirectUri } from "./authSession";
import { getSupabaseClient } from "./supabase";

type OAuthResult = { ok: true } | { ok: false; error: string };

WebBrowser.maybeCompleteAuthSession();

/** Вход через Google (Supabase OAuth + in-app browser). */
export async function signInWithGoogleOAuth(): Promise<OAuthResult> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return { ok: false, error: "Supabase не настроен в .env" };
  }

  const redirectTo = getAuthRedirectUri();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo,
      skipBrowserRedirect: true
    }
  });

  if (error) {
    const msg = error.message.toLowerCase();
    if (msg.includes("provider") || msg.includes("enabled")) {
      return {
        ok: false,
        error:
          "Google не включён в Supabase → Authentication → Providers → Google. Добавь Client ID и Secret из Google Cloud."
      };
    }
    return { ok: false, error: error.message };
  }

  if (!data?.url) {
    return { ok: false, error: "Supabase не вернул URL для Google-входа" };
  }

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (result.type === "cancel" || result.type === "dismiss") {
    return { ok: false, error: "Вход через Google отменён" };
  }

  if (result.type !== "success") {
    return { ok: false, error: "Не удалось завершить вход через Google" };
  }

  return applySessionFromAuthUrl(result.url);
}
