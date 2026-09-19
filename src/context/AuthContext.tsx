import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Linking from "expo-linking";
import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from "react";
import { applySessionFromAuthUrl, isAuthCallbackUrl } from "../services/authSession";
import { ensureCloudUser } from "../services/cloud/ensureUser";
import { signInWithGoogleOAuth } from "../services/oauth";
import { getSupabaseClient, isSupabaseConfigured } from "../services/supabase";

const DEMO_SESSION_KEY = "@kachai/demo_session";

export type AuthUser = {
  id: string;
  email: string | null;
};

export type AuthResult = { ok: true } | { ok: false; error: string };

type AuthContextValue = {
  user: AuthUser | null;
  isLoading: boolean;
  isConfigured: boolean;
  /** Есть JWT-сессия Supabase (нужна для Edge Function analyze-food). */
  hasSupabaseSession: boolean;
  signIn: (email: string, password: string) => Promise<AuthResult>;
  signUp: (email: string, password: string) => Promise<AuthResult>;
  signInWithGoogle: () => Promise<AuthResult>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function isDemoUserId(id: string): boolean {
  return id.startsWith("demo-");
}

function userFromSession(user: { id: string; email?: string | null }): AuthUser {
  return { id: user.id, email: user.email ?? null };
}

async function bootstrapCloudUser(user: AuthUser): Promise<void> {
  try {
    await ensureCloudUser(user);
  } catch (error) {
    if (__DEV__) console.warn("[KachAI] ensureCloudUser", error);
  }
}

/** Перевод частых ошибок Supabase на русский. */
function translateAuthError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("invalid login")) return "Неверный email или пароль";
  if (m.includes("invalid api key") || m.includes("apikey")) {
    return "Неверный EXPO_PUBLIC_SUPABASE_ANON_KEY. Возьми anon public (eyJ...) в Supabase → API";
  }
  if (m.includes("already registered")) return "Этот email уже зарегистрирован";
  if (m.includes("password should be")) return "Пароль слишком короткий (минимум 6 символов)";
  if (m.includes("unable to validate email")) return "Некорректный email";
  if (m.includes("email not confirmed")) return "Email не подтверждён — проверь почту";
  if (m.includes("rate limit") || m.includes("over_email_send")) {
    return "Слишком много попыток. Подожди 10–15 минут или отключи Confirm email в Supabase для разработки.";
  }
  if (m.includes("fetch") || m.includes("network")) {
    return "Нет сети. Проверь интернет и перезапусти Expo.";
  }
  return message;
}

function validate(email: string, password: string): string | null {
  if (!email.includes("@")) return "Введи корректный email";
  if (password.length < 6) return "Пароль минимум 6 символов";
  return null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [hasSupabaseSession, setHasSupabaseSession] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function bootstrap() {
      const supabase = getSupabaseClient();
      if (supabase) {
        // Убираем старый demo-вход — с Supabase нужна реальная сессия
        await AsyncStorage.removeItem(DEMO_SESSION_KEY);

        const { data } = await supabase.auth.getSession();
        if (mounted) {
          if (data.session?.user) {
            const nextUser = userFromSession(data.session.user);
            setUser(nextUser);
            setHasSupabaseSession(true);
            void bootstrapCloudUser(nextUser);
          } else {
            setUser(null);
            setHasSupabaseSession(false);
          }
          setIsLoading(false);
        }

        const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
          if (session?.user) {
            const nextUser = userFromSession(session.user);
            setUser(nextUser);
            setHasSupabaseSession(true);
            void bootstrapCloudUser(nextUser);
          } else {
            setUser(null);
            setHasSupabaseSession(false);
          }
        });
        return () => sub.subscription.unsubscribe();
      }

      // demo-режим только без Supabase
      const raw = await AsyncStorage.getItem(DEMO_SESSION_KEY);
      if (mounted && raw) {
        try {
          const parsed = JSON.parse(raw) as AuthUser;
          if (!isDemoUserId(parsed.id)) {
            await AsyncStorage.removeItem(DEMO_SESSION_KEY);
            setUser(null);
          } else {
            setUser(parsed);
          }
        } catch {
          setUser(null);
        }
      }
      if (mounted) {
        setHasSupabaseSession(false);
        setIsLoading(false);
      }
      return undefined;
    }

    const cleanupPromise = bootstrap();
    return () => {
      mounted = false;
      void cleanupPromise.then((cleanup) => cleanup?.());
    };
  }, []);

  // Подтверждение email / OAuth — deep link из браузера обратно в приложение
  useEffect(() => {
    const client = getSupabaseClient();
    if (!client) return;
    const supabase = client;

    async function handleIncomingUrl(url: string) {
      if (!isAuthCallbackUrl(url)) return;

      const result = await applySessionFromAuthUrl(url);
      if (!result.ok) {
        if (__DEV__) console.warn("[KachAI] auth deep link error", result.error, url);
        return;
      }

      const { data } = await supabase.auth.getSession();
      if (data.session?.user) {
        const nextUser = userFromSession(data.session.user);
        setUser(nextUser);
        setHasSupabaseSession(true);
        void bootstrapCloudUser(nextUser);
        if (__DEV__) console.log("[KachAI] Сессия из deep link", data.session.user.email);
      }
    }

    void Linking.getInitialURL().then((url) => {
      if (url) void handleIncomingUrl(url);
    });

    const subscription = Linking.addEventListener("url", ({ url }) => {
      void handleIncomingUrl(url);
    });

    return () => subscription.remove();
  }, []);

  const value = useMemo<AuthContextValue>(() => {
    async function signIn(email: string, password: string): Promise<AuthResult> {
      const validationError = validate(email, password);
      if (validationError) return { ok: false, error: validationError };

      const supabase = getSupabaseClient();
      if (supabase) {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password
        });
        if (error) {
          if (__DEV__) console.warn("[KachAI] signIn error", error.message);
          return { ok: false, error: translateAuthError(error.message) };
        }

        const { data: sessionData } = await supabase.auth.getSession();
        if (!sessionData.session?.user) {
          return {
            ok: false,
            error:
              "Сессия не создана. Проверь EXPO_PUBLIC_SUPABASE_ANON_KEY (нужен anon public eyJ...) в Supabase → Project Settings → API"
          };
        }

        const nextUser = userFromSession(sessionData.session.user);
        setUser(nextUser);
        setHasSupabaseSession(true);
        void bootstrapCloudUser(nextUser);
        return { ok: true };
      }

      const demoUser: AuthUser = { id: `demo-${Date.now()}`, email: email.trim() };
      await AsyncStorage.setItem(DEMO_SESSION_KEY, JSON.stringify(demoUser));
      setUser(demoUser);
      setHasSupabaseSession(false);
      return { ok: true };
    }

    async function signUp(email: string, password: string): Promise<AuthResult> {
      const validationError = validate(email, password);
      if (validationError) return { ok: false, error: validationError };

      const supabase = getSupabaseClient();
      if (supabase) {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password
        });
        if (error) {
          if (__DEV__) console.warn("[KachAI] signUp error", error.message);
          return { ok: false, error: translateAuthError(error.message) };
        }

        if (data.session?.user) {
          const nextUser = userFromSession(data.session.user);
          setUser(nextUser);
          setHasSupabaseSession(true);
          void bootstrapCloudUser(nextUser);
          return { ok: true };
        }

        // На случай если Supabase не вернул сессию сразу — пробуем войти
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password
        });
        if (!signInError && signInData.session?.user) {
          const nextUser = userFromSession(signInData.session.user);
          setUser(nextUser);
          setHasSupabaseSession(true);
          void bootstrapCloudUser(nextUser);
          return { ok: true };
        }

        const signInMsg = signInError ? translateAuthError(signInError.message) : "неизвестная ошибка";
        return {
          ok: false,
          error: `Аккаунт, возможно, создан. Нажми «Войти в зал» с тем же email и паролем. (${signInMsg})`
        };
      }

      const demoUser: AuthUser = { id: `demo-${Date.now()}`, email: email.trim() };
      await AsyncStorage.setItem(DEMO_SESSION_KEY, JSON.stringify(demoUser));
      setUser(demoUser);
      setHasSupabaseSession(false);
      return { ok: true };
    }

    async function signInWithGoogle(): Promise<AuthResult> {
      const supabase = getSupabaseClient();
      if (!supabase) {
        return { ok: false, error: "Supabase не настроен в .env" };
      }

      const result = await signInWithGoogleOAuth();
      if (!result.ok) {
        if (__DEV__) console.warn("[KachAI] Google signIn", result.error);
        return result;
      }

      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session?.user) {
        return { ok: false, error: "Сессия не создана после Google-входа" };
      }

      const nextUser = userFromSession(sessionData.session.user);
      setUser(nextUser);
      setHasSupabaseSession(true);
      void bootstrapCloudUser(nextUser);
      return { ok: true };
    }

    async function signOut(): Promise<void> {
      const supabase = getSupabaseClient();
      if (supabase) {
        await supabase.auth.signOut();
      }
      await AsyncStorage.removeItem(DEMO_SESSION_KEY);
      setUser(null);
      setHasSupabaseSession(false);
    }

    return {
      user,
      isLoading,
      isConfigured: isSupabaseConfigured,
      hasSupabaseSession,
      signIn,
      signUp,
      signInWithGoogle,
      signOut
    };
  }, [user, isLoading, hasSupabaseSession]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth должен использоваться внутри AuthProvider");
  return ctx;
}
