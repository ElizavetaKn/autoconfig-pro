// src/app/checkout/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { MainNav } from "@/components/ui/MainNav";
import {
  calcTotal,
  clearCart,
  readCart,
  readCheckoutDraft,
  saveCheckoutDraft,
  type CheckoutFormData,
} from "@/lib/cart";
import { createOrder } from "@/lib/api";
import { calculateGrandTotal } from "@/lib/pricing";
import styles from "./checkout.module.css";

type DeliveryMethod = "courier" | "pickup" | "service";
type PaymentMethod = "card" | "cash" | "invoice";

const LAST_ORDER_KEY = "autoconfig_last_order_summary_v1";

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

function paymentLabel(method: PaymentMethod) {
  if (method === "cash") return "Оплата при получении";
  if (method === "invoice") return "Безналичный счёт";
  return "Банковская карта";
}

function formatPrice(value: number) {
  return new Intl.NumberFormat("ru-RU").format(value) + " р.";
}

function normalizePhone(value: string) {
  return value.replace(/[\s()\-.]/g, "").trim();
}

function isValidPhone(value: string) {
  const normalized = normalizePhone(value);

  if (!normalized) return false;
  if (!/^\+?\d+$/.test(normalized)) return false;

  const digits = normalized.replace(/^\+/, "");

  if (digits.length < 10 || digits.length > 15) return false;
  if (/^(\d)\1+$/.test(digits)) return false;

  return true;
}

function emptyCustomer(): CheckoutFormData {
  return {
    fullName: "",
    phone: "",
    email: "",
    city: "",
    street: "",
    house: "",
    apartment: "",
    postalCode: "",
    comment: "",
  };
}

export default function CheckoutPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [itemsCount, setItemsCount] = useState(0);
  const [subtotal, setSubtotal] = useState(0);
  const [form, setForm] = useState<CheckoutFormData>(emptyCustomer());
  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod>("courier");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("card");
  const [promoCode, setPromoCode] = useState("");
  const [agree, setAgree] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [statusText, setStatusText] = useState("");

  useEffect(() => {
    const cartItems = readCart();
    const draft = readCheckoutDraft();

    if (cartItems.length === 0) {
      router.replace("/cart");
      return;
    }

    setItemsCount(cartItems.reduce((sum, item) => sum + item.qty, 0));
    setSubtotal(calcTotal(cartItems));

    if (draft?.customer) {
      setForm(draft.customer);
    }

    const promo = searchParams.get("promo") ?? "";
    const delivery = (searchParams.get("delivery") as DeliveryMethod | null) ?? null;

    if (promo) setPromoCode(promo);
    if (delivery === "courier" || delivery === "pickup" || delivery === "service") {
      setDeliveryMethod(delivery);
    }
  }, [router, searchParams]);

  const pricing = useMemo(() => {
    return calculateGrandTotal(subtotal, deliveryPrice(deliveryMethod), promoCode);
  }, [subtotal, deliveryMethod, promoCode]);

  const setField = (key: keyof CheckoutFormData, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));

    setErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const validate = () => {
    const nextErrors: Record<string, string> = {};

    if (!form.fullName.trim()) nextErrors.fullName = "Укажи имя и фамилию.";
    if (!form.phone.trim()) {
      nextErrors.phone = "Укажи телефон.";
    } else if (!isValidPhone(form.phone)) {
      nextErrors.phone = "Укажи корректный телефон: 10–15 цифр, можно с +, пробелами, скобками или дефисами.";
    }
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) nextErrors.email = "Проверь email.";
    if (!form.city.trim()) nextErrors.city = "Укажи город.";
    if (!form.street.trim()) nextErrors.street = "Укажи улицу.";
    if (!form.house.trim()) nextErrors.house = "Укажи дом.";
    if (!form.postalCode.trim()) nextErrors.postalCode = "Укажи индекс.";
    if (!agree) nextErrors.agree = "Нужно подтвердить согласие.";

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const submitOrder = async () => {
    if (!validate()) return;

    const items = readCart();
    if (!items.length) {
      router.replace("/cart");
      return;
    }

    setLoading(true);
    setStatusText("");

    try {
      saveCheckoutDraft({
        customer: form,
        items,
        total: pricing.total,
        createdAt: new Date().toISOString(),
      });

      const result = await createOrder({
        customer: form,
        items,
        total: pricing.total,
      });

      window.localStorage.setItem(
        LAST_ORDER_KEY,
        JSON.stringify({
          orderId: result.order_id,
          createdAt: result.created_at,
          total: pricing.total,
          deliveryMethod,
          paymentMethod,
          promoCode,
          customer: form,
          itemsCount,
        })
      );

      clearCart();
      router.push(
        `/checkout/success?order_id=${result.order_id}&status=${result.status}`
      );
    } catch (e: any) {
      setStatusText(e?.message ?? "Не удалось оформить заказ.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className={styles.page}>
      <div className="page-shell">
        <MainNav active="catalog" />

        <section className={styles.hero}>
          <h1 className={styles.title}>Оформление заказа</h1>
        </section>

        <div className={styles.steps}>
          <div className={styles.stepActive}>1. Контакты</div>
          <div className={styles.stepActive}>2. Доставка</div>
          <div className={styles.stepActive}>3. Подтверждение</div>
        </div>

        <section className={styles.layout}>
          <div className={styles.formColumn}>
            <div className={styles.blockCard}>
              <h2 className={styles.blockTitle}>Контактные данные</h2>

              <div className={styles.formGrid}>
                <label className={styles.field}>
                  <span>Имя и фамилия</span>
                  <input
                    className={styles.input}
                    value={form.fullName}
                    onChange={(e) => setField("fullName", e.target.value)}
                    placeholder="Иван Петров"
                  />
                  {errors.fullName ? <small>{errors.fullName}</small> : null}
                </label>

                <label className={styles.field}>
                  <span>Телефон</span>
                  <input
                    className={styles.input}
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    value={form.phone}
                    onChange={(e) => setField("phone", e.target.value)}
                    placeholder="+375..."
                  />
                  {errors.phone ? <small>{errors.phone}</small> : null}
                </label>

                <label className={styles.field}>
                  <span>Email</span>
                  <input
                    className={styles.input}
                    value={form.email}
                    onChange={(e) => setField("email", e.target.value)}
                    placeholder="name@email.com"
                  />
                  {errors.email ? <small>{errors.email}</small> : null}
                </label>

                <label className={styles.field}>
                  <span>Город</span>
                  <input
                    className={styles.input}
                    value={form.city}
                    onChange={(e) => setField("city", e.target.value)}
                    placeholder="Минск"
                  />
                  {errors.city ? <small>{errors.city}</small> : null}
                </label>

                <label className={styles.field}>
                  <span>Улица</span>
                  <input
                    className={styles.input}
                    value={form.street}
                    onChange={(e) => setField("street", e.target.value)}
                    placeholder="Проспект Независимости"
                  />
                  {errors.street ? <small>{errors.street}</small> : null}
                </label>

                <label className={styles.field}>
                  <span>Дом</span>
                  <input
                    className={styles.input}
                    value={form.house}
                    onChange={(e) => setField("house", e.target.value)}
                    placeholder="10"
                  />
                  {errors.house ? <small>{errors.house}</small> : null}
                </label>

                <label className={styles.field}>
                  <span>Квартира / офис</span>
                  <input
                    className={styles.input}
                    value={form.apartment}
                    onChange={(e) => setField("apartment", e.target.value)}
                    placeholder="25"
                  />
                </label>

                <label className={styles.field}>
                  <span>Почтовый индекс</span>
                  <input
                    className={styles.input}
                    value={form.postalCode}
                    onChange={(e) => setField("postalCode", e.target.value)}
                    placeholder="220000"
                  />
                  {errors.postalCode ? <small>{errors.postalCode}</small> : null}
                </label>
              </div>

              <label className={styles.field}>
                <span>Комментарий к заказу</span>
                <textarea
                  className={styles.textarea}
                  value={form.comment}
                  onChange={(e) => setField("comment", e.target.value)}
                  placeholder="Пожелания по времени, сервису или доставке"
                  rows={4}
                />
              </label>
            </div>

            <div className={styles.blockCard}>
              <h2 className={styles.blockTitle}>Доставка и оплата</h2>

              <div className={styles.choiceList}>
                {(["courier", "pickup", "service"] as DeliveryMethod[]).map((method) => (
                  <button
                    key={method}
                    type="button"
                    className={`${styles.choiceButton} ${
                      deliveryMethod === method ? styles.choiceButtonActive : ""
                    }`}
                    onClick={() => setDeliveryMethod(method)}
                  >
                    <b>{deliveryLabel(method)}</b>
                    <span>{formatPrice(deliveryPrice(method))}</span>
                  </button>
                ))}
              </div>

              <div className={styles.choiceList}>
                {(["card", "cash", "invoice"] as PaymentMethod[]).map((method) => (
                  <button
                    key={method}
                    type="button"
                    className={`${styles.choiceButton} ${
                      paymentMethod === method ? styles.choiceButtonActive : ""
                    }`}
                    onClick={() => setPaymentMethod(method)}
                  >
                    <b>{paymentLabel(method)}</b>
                  </button>
                ))}
              </div>
            </div>

            <div className={styles.blockCard}>
              <label className={styles.checkboxRow}>
                <input
                  type="checkbox"
                  checked={agree}
                  onChange={(e) => setAgree(e.target.checked)}
                />
                Подтверждаю корректность данных и согласие на оформление заказа.
              </label>
              {errors.agree ? <small className={styles.errorText}>{errors.agree}</small> : null}
            </div>
          </div>

          <aside className={styles.summaryColumn}>
            <div className={styles.summaryCard}>
              <div className={styles.summaryTitle}>Итог заказа</div>

              <div className={styles.summaryRow}>
                <span>Позиций в заказе</span>
                <b>{itemsCount}</b>
              </div>

              <div className={styles.summaryRow}>
                <span>Товары</span>
                <b>{formatPrice(pricing.subtotal)}</b>
              </div>

              <div className={styles.summaryRow}>
                <span>Промокод</span>
                <b>{pricing.promo.applied ? pricing.promo.normalizedCode : "—"}</b>
              </div>

              <div className={styles.summaryRow}>
                <span>Скидка</span>
                <b>
                  {pricing.promo.applied
                    ? `− ${formatPrice(pricing.promo.discountAmount)}`
                    : "0 р."}
                </b>
              </div>

              <div className={styles.summaryRow}>
                <span>Доставка</span>
                <b>{formatPrice(pricing.deliveryPrice)}</b>
              </div>

              <div className={styles.summaryRow}>
                <span>Оплата</span>
                <b>{paymentLabel(paymentMethod)}</b>
              </div>

              <div className={`${styles.summaryRow} ${styles.summaryRowGrand}`}>
                <span>Итого</span>
                <strong>{formatPrice(pricing.total)}</strong>
              </div>

              {statusText ? <div className={styles.statusText}>{statusText}</div> : null}

              <button
                type="button"
                className={styles.submitButton}
                onClick={submitOrder}
                disabled={loading}
              >
                {loading ? "Оформляем..." : "Подтвердить заказ"}
              </button>
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}