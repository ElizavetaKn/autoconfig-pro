// src/lib/parts-ui.ts

import type { Part } from "@/lib/api";

export type StockMeta = {
  code: "in_stock" | "few_left" | "under_order";
  label: string;
  detail: string;
  eta: string;
};

export function formatPrice(value: number) {
  return new Intl.NumberFormat("ru-RU").format(value) + " р.";
}

export function formatCondition(value?: string | null) {
  if (!value) return "Не указано";
  if (value === "new") return "Новая";
  if (value === "used") return "Б/у";
  return value;
}

export function formatOriginality(value?: string | null) {
  if (!value) return "Не указано";
  if (value === "oem") return "Оригинал";
  if (value === "analog") return "Аналог";
  return value;
}

export function buildArticle(partId: number, brand: string) {
  const prefix = brand
    .replace(/[^A-Za-zА-Яа-я]/g, "")
    .slice(0, 3)
    .toUpperCase();

  return `${prefix || "ACP"}-${String(partId).padStart(6, "0")}`;
}

export function getStockMeta(part: Part): StockMeta {
  const pivot = (part.id + part.price) % 7;

  if (part.condition === "used" && pivot >= 4) {
    return {
      code: "under_order",
      label: "Под заказ",
      detail: "Требуется подтверждение наличия",
      eta: "3–7 дней",
    };
  }

  if (pivot <= 1) {
    return {
      code: "few_left",
      label: "Мало на складе",
      detail: "Осталось 1–2 шт.",
      eta: "Сегодня / завтра",
    };
  }

  return {
    code: "in_stock",
    label: "В наличии",
    detail: "Можно оформить сразу",
    eta: "Сегодня",
  };
}

export function getCompatibilityText(part: Part) {
  if (part.cross_brand) {
    return "Есть совместимые аналоги";
  }

  return "Подбор по выбранному автомобилю";
}

export function getDeliveryText(part: Part) {
  if (part.condition === "used") {
    return "Склад партнёра / уточнение перед отправкой";
  }

  if (part.originality === "oem") {
    return "Центральный склад производителя";
  }

  return "Локальный склад / партнёрский поставщик";
}