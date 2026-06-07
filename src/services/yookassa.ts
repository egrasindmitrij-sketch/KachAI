import { PurchaseResult } from "../types/subscription";

const MOCK_DELAY_MS = 1500;

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function createMockPaymentId(plan: "monthly" | "yearly") {
  return `yk_mock_${plan}_${Date.now()}`;
}

/**
 * Заглушка оплаты ЮKassa — месячная подписка 300 ₽.
 * В продакшене: создание платежа на backend + redirect / SDK.
 */
export async function purchaseMonthly(): Promise<PurchaseResult> {
  await delay(MOCK_DELAY_MS);

  return {
    success: true,
    paymentId: createMockPaymentId("monthly"),
    message: "Тестовый платёж ЮKassa (monthly) успешно обработан"
  };
}

/**
 * Заглушка оплаты ЮKassa — годовая подписка 2700 ₽.
 */
export async function purchaseYearly(): Promise<PurchaseResult> {
  await delay(MOCK_DELAY_MS);

  return {
    success: true,
    paymentId: createMockPaymentId("yearly"),
    message: "Тестовый платёж ЮKassa (yearly) успешно обработан"
  };
}
