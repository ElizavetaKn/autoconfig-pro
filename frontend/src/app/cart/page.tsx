// src/app/cart/page.tsx
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { MainNav } from "@/components/ui/MainNav";
import {
  CART_UPDATED_EVENT,
  calcTotal,
  readCart,
  removeFromCart,
  saveEditableConfiguration,
  setQty,
  type CartItem,
} from "@/lib/cart";
import { calculateGrandTotal, normalizePromoCode } from "@/lib/pricing";
import { formatCondition, formatOriginality } from "@/lib/parts-ui";
import styles from "./cart.module.css";

type DeliveryMethod = "courier" | "pickup" | "service";

function deliveryPrice(method: DeliveryMethod) {
  if (method === "pickup") return 0;
  if (method === "service") return 15;
  return 25;
}

function deliveryLabel(method: DeliveryMethod) {
  if (method === "pickup") return "Самовывоз";
  if (method === "service") return "Доставка в сервисный центр";
  return "Курьер";
}

function formatPrice(value: number) {
  return new Intl.NumberFormat("ru-RU").format(value) + " р.";
}

export default function CartPage() {
  const router = useRouter();

  const [items, setItems] = useState<CartItem[]>([]);
  const [promoCode, setPromoCode] = useState("");
  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod>("courier");
  const [statusText, setStatusText] = useState("");

  useEffect(() => {
    const sync = () => setItems(readCart());

    sync();
    window.addEventListener("focus", sync);
    window.addEventListener("storage", sync);
    window.addEventListener(CART_UPDATED_EVENT, sync as EventListener);

    return () => {
      window.removeEventListener("focus", sync);
      window.removeEventListener("storage", sync);
      window.removeEventListener(CART_UPDATED_EVENT, sync as EventListener);
    };
  }, []);

  const subtotal = useMemo(() => calcTotal(items), [items]);

  const pricing = useMemo(() => {
    return calculateGrandTotal(subtotal, deliveryPrice(deliveryMethod), promoCode);
  }, [subtotal, deliveryMethod, promoCode]);

  const hasConfiguration = items.some((item) => item.sourceType === "configuration");

  const applyPromo = () => {
    const normalized = normalizePromoCode(promoCode);
    setPromoCode(normalized);
    setStatusText(
      normalized
        ? pricing.promo.applied
          ? `Промокод применён: ${pricing.promo.message}.`
          : pricing.promo.message
        : "Промокод очищен."
    );
    window.setTimeout(() => setStatusText(""), 1800);
  };

  const changeQty = (id: number, nextQty: number) => {
    const nextItems = setQty(id, nextQty);
    setItems([...nextItems]);
  };

  const deleteItem = (id: number) => {
    const nextItems = removeFromCart(id);
    setItems([...nextItems]);
  };

  const editConfiguration = (item: CartItem) => {
    if (!item.configurationData || item.sourceType !== "configuration") return;

    saveEditableConfiguration(item.configurationData);
    router.push("/configurator?resume=1");
  };

  const goToCheckout = () => {
    const sp = new URLSearchParams();
    if (promoCode.trim()) sp.set("promo", normalizePromoCode(promoCode));
    sp.set("delivery", deliveryMethod);
    router.push(`/checkout?${sp.toString()}`);
  };

  return (
    <main className={styles.page}>
      <div className="page-shell">
        <MainNav active="catalog" />

        <div className={styles.breadcrumbs}>
          <Link href="/catalog" className={styles.crumbLink}>
            Каталог
          </Link>
          <span className={styles.crumbSep}>›</span>
          <span className={styles.crumbCurrent}>Корзина</span>
        </div>

        <section className={styles.hero}>
          <div>
            <div className={styles.kicker}>Оформление заказа</div>
            <h1 className={styles.title}>Корзина</h1>
            <p className={styles.subtitle}>
              Проверьте выбранные товары перед оформлением заказа
            </p>
          </div>
        </section>

        {items.length === 0 ? (
          <section className={styles.emptyCard}>
            <h2 className={styles.emptyTitle}>Корзина пока пуста</h2>
            <p className={styles.emptyText}>
              Добавь запчасти из каталога или конфигурацию автомобиля из конфигуратора.
            </p>
            <div className={styles.emptyActions}>
              <Link href="/" className={styles.primaryLink}>
                Открыть конфигуратор
              </Link>
              <Link href="/catalog" className={styles.secondaryLink}>
                Перейти в каталог
              </Link>
            </div>
          </section>
        ) : (
          <section className={styles.layout}>
            <div className={styles.itemsColumn}>
              <div className={styles.sectionTitle}>Состав заказа</div>

              <div className={styles.cardList}>
                {items.map((item) => (
                  <article key={item.id} className={styles.itemCard}>
                    <div className={styles.itemTop}>
                      <div>
                        <div className={styles.itemType}>
                          {item.sourceType === "configuration"
                            ? "Конфигурация автомобиля"
                            : item.category}
                        </div>
                        <h2 className={styles.itemTitle}>{item.title}</h2>
                      </div>

                      <button
                        type="button"
                        className={styles.removeButton}
                        onClick={() => deleteItem(item.id)}
                      >
                        Удалить
                      </button>
                    </div>

                    <div className={styles.badges}>
                      <span className={styles.badge}>{item.brand}</span>
                      <span className={styles.badge}>{formatCondition(item.condition)}</span>
                      <span className={styles.badge}>{formatOriginality(item.originality)}</span>
                    </div>

                    {item.vehicleContext?.year || item.vehicleContext?.bodyType ? (
                      <div className={styles.compatText}>
                        Контекст авто:{" "}
                        {item.vehicleContext.year ? `${item.vehicleContext.year}` : "—"}
                        {item.vehicleContext.bodyType ? ` · ${item.vehicleContext.bodyType}` : ""}
                      </div>
                    ) : null}

                    <div className={styles.itemBottom}>
                      <div className={styles.itemControls}>
                        <div className={styles.qtyBox}>
                          <button
                            type="button"
                            className={styles.qtyButton}
                            onClick={() => changeQty(item.id, Math.max(1, item.qty - 1))}
                          >
                            −
                          </button>
                          <span className={styles.qtyValue}>{item.qty}</span>
                          <button
                            type="button"
                            className={styles.qtyButton}
                            onClick={() => changeQty(item.id, item.qty + 1)}
                          >
                            +
                          </button>
                        </div>

                        {item.sourceType === "configuration" && item.configurationData ? (
                          <button
                            type="button"
                            className={styles.editButton}
                            onClick={() => editConfiguration(item)}
                          >
                            Изменить конфигурацию
                          </button>
                        ) : null}
                      </div>

                      <div className={styles.itemPrice}>
                        {formatPrice(item.price * item.qty)}
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </div>

            <aside className={styles.summaryColumn}>
              <div className={styles.summaryCard}>
                <div className={styles.summaryTitle}>Параметры заказа</div>

                <label className={styles.field}>
                  <span>Промокод</span>
                  <div className={styles.inlineField}>
                    <input
                      className={styles.input}
                      value={promoCode}
                      onChange={(e) => setPromoCode(e.target.value)}
                      placeholder="AUTO5"
                    />
                    <button type="button" className={styles.inlineButton} onClick={applyPromo}>
                      Применить
                    </button>
                  </div>
                </label>

                <div className={styles.field}>
                  <span>Способ доставки</span>

                  <div className={styles.deliveryList}>
                    {(["courier", "pickup", "service"] as DeliveryMethod[]).map((method) => (
                      <button
                        key={method}
                        type="button"
                        className={`${styles.deliveryButton} ${
                          deliveryMethod === method ? styles.deliveryButtonActive : ""
                        }`}
                        onClick={() => setDeliveryMethod(method)}
                      >
                        <b>{deliveryLabel(method)}</b>
                        <small>{formatPrice(deliveryPrice(method))}</small>
                      </button>
                    ))}
                  </div>
                </div>

                {hasConfiguration ? (
                  <div className={styles.noticeBox}>
                    В заказе есть конфигурация автомобиля. На checkout можно будет оформить заявку на покупку автомобиля вместе с деталями.
                  </div>
                ) : null}

                {statusText ? <div className={styles.statusText}>{statusText}</div> : null}

                <div className={styles.totals}>
                  <div className={styles.totalRow}>
                    <span>Товары</span>
                    <b>{formatPrice(pricing.subtotal)}</b>
                  </div>

                  <div className={styles.totalRow}>
                    <span>Доставка</span>
                    <b>{formatPrice(pricing.deliveryPrice)}</b>
                  </div>

                  <div className={styles.totalRow}>
                    <span>Скидка</span>
                    <b>
                      {pricing.promo.applied
                        ? `− ${formatPrice(pricing.promo.discountAmount)}`
                        : "0 р."}
                    </b>
                  </div>

                  <div className={`${styles.totalRow} ${styles.totalRowGrand}`}>
                    <span>Итого</span>
                    <strong>{formatPrice(pricing.total)}</strong>
                  </div>
                </div>

                <button type="button" className={styles.checkoutButton} onClick={goToCheckout}>
                  Перейти к оформлению
                </button>
              </div>
            </aside>
          </section>
        )}
      </div>
    </main>
  );
}