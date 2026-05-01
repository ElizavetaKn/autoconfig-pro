// src/components/order/OrderSummary.tsx
import type { CartItem } from "@/lib/cart";
import styles from "./OrderSummary.module.css";

type OrderSummaryProps = {
  title?: string;
  items: CartItem[];
  total: number;
};

function formatPrice(v: number) {
  return new Intl.NumberFormat("ru-RU").format(v) + " р.";
}

function buildItemMeta(item: CartItem) {
  const parts = [`${item.brand} · ${item.category}`];

  if (item.sourceType === "configuration") {
    parts.push("Конфигурация автомобиля");
  }

  if (item.vehicleContext?.modelId) {
    parts.push(`модель ID ${item.vehicleContext.modelId}`);
  }

  if (item.vehicleContext?.year) {
    parts.push(`год ${item.vehicleContext.year}`);
  }

  if (item.vehicleContext?.bodyType) {
    parts.push(`кузов ${item.vehicleContext.bodyType}`);
  }

  return parts.join(" · ");
}

export function OrderSummary({
  title = "Ваш заказ",
  items,
  total,
}: OrderSummaryProps) {
  return (
    <aside className={styles.sidebar}>
      <h2 className={styles.sidebarTitle}>{title}</h2>

      <div className={styles.items}>
        {items.map((item) => (
          <div key={item.id} className={styles.item}>
            <div className={styles.itemTitle}>{item.title}</div>
            <div className={styles.itemMeta}>{buildItemMeta(item)}</div>
            <div className={styles.itemLine}>
              {item.qty} × {formatPrice(item.price)}
            </div>
          </div>
        ))}
      </div>

      <div className={styles.total}>
        Итого: <b>{formatPrice(total)}</b>
      </div>
    </aside>
  );
}