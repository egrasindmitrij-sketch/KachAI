import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState
} from "react";
import {
  activateMonthlyPlan,
  activateYearlyPlan,
  getAccessUntil,
  hasPremiumAccess,
  loadSubscriptionState
} from "../services/subscriptionStorage";
import { purchaseMonthly, purchaseYearly } from "../services/yookassa";
import { SubscriptionState } from "../types/subscription";

type SubscriptionContextValue = {
  state: SubscriptionState | null;
  hasAccess: boolean;
  isLoading: boolean;
  isPurchasing: boolean;
  purchaseError: string | null;
  timeLeftMs: number;
  refresh: () => Promise<void>;
  purchaseMonthlyPlan: () => Promise<boolean>;
  purchaseYearlyPlan: () => Promise<boolean>;
};

const SubscriptionContext = createContext<SubscriptionContextValue | undefined>(undefined);

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SubscriptionState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [purchaseError, setPurchaseError] = useState<string | null>(null);
  const [nowTick, setNowTick] = useState(Date.now());

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      const next = await loadSubscriptionState();
      setState(next);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    const timer = setInterval(() => setNowTick(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const timeLeftMs = useMemo(() => {
    if (!state) return 0;
    const until = getAccessUntil(state);
    if (!until) return 0;
    return Math.max(new Date(until).getTime() - nowTick, 0);
  }, [state, nowTick]);

  const hasAccess = state ? hasPremiumAccess(state) : false;

  const purchaseMonthlyPlan = useCallback(async () => {
    setIsPurchasing(true);
    setPurchaseError(null);

    try {
      const payment = await purchaseMonthly();
      if (!payment.success) {
        setPurchaseError("Оплата не прошла. Попробуй снова.");
        return false;
      }

      const next = await activateMonthlyPlan();
      setState(next);
      return true;
    } catch {
      setPurchaseError("Ошибка оплаты. Проверь соединение.");
      return false;
    } finally {
      setIsPurchasing(false);
    }
  }, []);

  const purchaseYearlyPlan = useCallback(async () => {
    setIsPurchasing(true);
    setPurchaseError(null);

    try {
      const payment = await purchaseYearly();
      if (!payment.success) {
        setPurchaseError("Оплата не прошла. Попробуй снова.");
        return false;
      }

      const next = await activateYearlyPlan();
      setState(next);
      return true;
    } catch {
      setPurchaseError("Ошибка оплаты. Проверь соединение.");
      return false;
    } finally {
      setIsPurchasing(false);
    }
  }, []);

  const value = useMemo(
    () => ({
      state,
      hasAccess,
      isLoading,
      isPurchasing,
      purchaseError,
      timeLeftMs,
      refresh,
      purchaseMonthlyPlan,
      purchaseYearlyPlan
    }),
    [
      state,
      hasAccess,
      isLoading,
      isPurchasing,
      purchaseError,
      timeLeftMs,
      refresh,
      purchaseMonthlyPlan,
      purchaseYearlyPlan
    ]
  );

  return <SubscriptionContext.Provider value={value}>{children}</SubscriptionContext.Provider>;
}

export function useSubscription() {
  const ctx = useContext(SubscriptionContext);
  if (!ctx) {
    throw new Error("useSubscription must be used within SubscriptionProvider");
  }
  return ctx;
}
