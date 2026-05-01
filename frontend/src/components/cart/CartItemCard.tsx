// src/components/cart/CartItemCard.tsx
"use client";

import type { CartItem } from "@/lib/cart";
import styles from "./CartItemCard.module.css";

type CartItemCardProps = {
  item: CartItem;
  onQtyChange: (id: number, qty: number) => void;
  onRemove: (id: number) => void;
};

function formatPrice(v: number) {
  return new Intl.NumberFormat("ru-RU").format(v) + " р.";
}

function getSubtitle(item: CartItem) {
  return `${item.category} · ${item.brand}`;
}

function getSpecs(item: CartItem) {
  const specs: string[] = [];

  if (item.sourceType === "configuration") {
    specs.push("Тип: конфигурация автомобиля");
  } else {
    specs.push(`Категория: ${item.category.toLowerCase()}`);
    specs.push(`Бренд: ${item.brand}`);
  }

  if (item.vehicleContext?.modelId) {
    specs.push(`Подбор: модель ID ${item.vehicleContext.modelId}`);
  }

  if (item.vehicleContext?.year) {
    specs.push(`Год: ${item.vehicleContext.year}`);
  }

  if (item.vehicleContext?.bodyType) {
    specs.push(`Кузов: ${item.vehicleContext.bodyType}`);
  }

  if (item.vehicleContext?.query) {
    specs.push(`Поиск: ${item.vehicleContext.query}`);
  }

  return specs;
}

export function CartItemCard({
  item,
  onQtyChange,
  onRemove,
}: CartItemCardProps) {
  const specs = getSpecs(item);

  return (
    <article className={styles.card}>
      <div className={styles.media}>
        <div className={styles.mediaGlow} />
        <div className={styles.mediaPlaceholder}>{item.category}</div>
      </div>

      <div className={styles.content}>
        <div className={styles.topRow}>
          <div className={styles.titleBlock}>
            <h2 className={styles.title}>{item.title}</h2>
            <div className={styles.subtitle}>{getSubtitle(item)}</div>
          </div>

          <div className={styles.price}>{formatPrice(item.price * item.qty)}</div>
        </div>

        <div className={styles.specs}>
          {specs.map((spec) => (
            <div key={spec} className={styles.spec}>
              {spec}
            </div>
          ))}
        </div>

        <div className={styles.bottomRow}>
          <div className={styles.controls}>
            <label className={styles.qtyLabel}>
              Кол-во:
              <input
                value={item.qty}
                onChange={(e) => onQtyChange(item.id, Number(e.target.value))}
                type="number"
                min={1}
                className={styles.qtyInput}
              />
            </label>

            {item.vehicleContext || item.sourceType === "configuration" ? (
              <span className={styles.contextPill}>Контекст авто сохранён</span>
            ) : (
              <span className={styles.contextHint}>Базовая позиция каталога</span>
            )}
          </div>

          <button
            type="button"
            onClick={() => onRemove(item.id)}
            className={styles.removeButton}
          >
            Удалить
          </button>
        </div>
      </div>
    </article>
  );
}