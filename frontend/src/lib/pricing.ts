// src/lib/pricing.ts

export type PromoResult = {
  normalizedCode: string;
  applied: boolean;
  discountAmount: number;
  message: string;
};

const PROMO_RULES: Record<
  string,
  { percent: number; maxDiscount?: number; label: string }
> = {
  AUTO5: { percent: 5, label: "Скидка 5% на заказ" },
  CONFIG10: { percent: 10, maxDiscount: 4000, label: "Скидка 10% на конфигурацию" },
  SERVICE7: { percent: 7, maxDiscount: 2500, label: "Скидка 7% на заказ с сервисом" },
};

export function normalizePromoCode(value: string) {
  return value.trim().toUpperCase();
}

export function getPromoResult(subtotal: number, promoCode: string): PromoResult {
  const normalizedCode = normalizePromoCode(promoCode);

  if (!normalizedCode) {
    return {
      normalizedCode,
      applied: false,
      discountAmount: 0,
      message: "Промокод не введён.",
    };
  }

  const rule = PROMO_RULES[normalizedCode];
  if (!rule) {
    return {
      normalizedCode,
      applied: false,
      discountAmount: 0,
      message: "Промокод не найден.",
    };
  }

  const rawDiscount = Math.round((subtotal * rule.percent) / 100);
  const discountAmount =
    typeof rule.maxDiscount === "number"
      ? Math.min(rawDiscount, rule.maxDiscount)
      : rawDiscount;

  return {
    normalizedCode,
    applied: true,
    discountAmount,
    message: rule.label,
  };
}

export function calculateGrandTotal(
  subtotal: number,
  deliveryPrice: number,
  promoCode: string
) {
  const promo = getPromoResult(subtotal, promoCode);
  const total = Math.max(0, subtotal - promo.discountAmount + deliveryPrice);

  return {
    subtotal,
    deliveryPrice,
    promo,
    total,
  };
}