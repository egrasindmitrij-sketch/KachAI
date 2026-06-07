import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState
} from "react";

export type ToastType = "success" | "error" | "info";

type ToastState = {
  message: string;
  type: ToastType;
} | null;

type UiContextValue = {
  isGlobalLoading: boolean;
  loadingMessage: string;
  toast: ToastState;
  showLoading: (message?: string) => void;
  hideLoading: () => void;
  showToast: (message: string, type?: ToastType) => void;
  hideToast: () => void;
};

const UiContext = createContext<UiContextValue | undefined>(undefined);

const TOAST_DURATION_MS = 2800;

export function UiProvider({ children }: { children: ReactNode }) {
  const [isGlobalLoading, setIsGlobalLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("Загрузка...");
  const [toast, setToast] = useState<ToastState>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hideToast = useCallback(() => {
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
      toastTimerRef.current = null;
    }
    setToast(null);
  }, []);

  const showToast = useCallback(
    (message: string, type: ToastType = "info") => {
      hideToast();
      setToast({ message, type });
      toastTimerRef.current = setTimeout(() => {
        setToast(null);
        toastTimerRef.current = null;
      }, TOAST_DURATION_MS);
    },
    [hideToast]
  );

  const showLoading = useCallback((message = "Загрузка...") => {
    setLoadingMessage(message);
    setIsGlobalLoading(true);
  }, []);

  const hideLoading = useCallback(() => {
    setIsGlobalLoading(false);
  }, []);

  const value = useMemo(
    () => ({
      isGlobalLoading,
      loadingMessage,
      toast,
      showLoading,
      hideLoading,
      showToast,
      hideToast
    }),
    [isGlobalLoading, loadingMessage, toast, showLoading, hideLoading, showToast, hideToast]
  );

  return <UiContext.Provider value={value}>{children}</UiContext.Provider>;
}

export function useUi() {
  const ctx = useContext(UiContext);
  if (!ctx) {
    throw new Error("useUi must be used within UiProvider");
  }
  return ctx;
}
