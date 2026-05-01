// src/app/checkout/success/page.tsx
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { MainNav } from "@/components/ui/MainNav";
import styles from "./success.module.css";

const LAST_ORDER_KEY = "autoconfig_last_order_summary_v1";

type LastOrderSummary = {
  orderId: number;
  createdAt: string;
  total: number;
  deliveryMethod: string;
  paymentMethod: string;
  promoCode: string;
  itemsCount: number;
  customer: {
    fullName: string;
    phone: string;
    email: string;
  };
};

function formatPrice(value: number) {
  return new Intl.NumberFormat("ru-RU").format(value) + " р.";
}

function formatDate(value?: string) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("ru-RU", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export default function CheckoutSuccessPage() {
  const searchParams = useSearchParams();
  const [summary, setSummary] = useState<LastOrderSummary | null>(null);

  const orderId = searchParams.get("order_id") ?? "—";
  const status = searchParams.get("status") ?? "created";

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(LAST_ORDER_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      setSummary(parsed);
    } catch {
      setSummary(null);
    }
  }, []);

  return (
    <main className={styles.page}>
      <div className="page-shell">
        <MainNav active="account" />

        <section className={styles.card}>
          <div className={styles.icon}>✓</div>
          <div className={styles.kicker}>Заказ оформлен</div>
          <h1 className={styles.title}>Спасибо, заявка принята</h1>

          <p className={styles.text}>
            Заказ успешно создан. Следующим шагом пользователь может перейти в личный кабинет, отследить историю заказа или продолжить подбор.
          </p>

          <div className={styles.infoGrid}>
            <div className={styles.infoItem}>
              <span>Номер заказа</span>
              <b>#{orderId}</b>
            </div>

            <div className={styles.infoItem}>
              <span>Статус</span>
              <b>{status}</b>
            </div>

            <div className={styles.infoItem}>
              <span>Дата</span>
              <b>{formatDate(summary?.createdAt)}</b>
            </div>

            <div className={styles.infoItem}>
              <span>Сумма</span>
              <b>{summary ? formatPrice(summary.total) : "—"}</b>
            </div>
          </div>

          {summary ? (
            <div className={styles.summaryBox}>
              <div className={styles.summaryTitle}>Сводка заказа</div>
              <div className={styles.summaryRow}>
                <span>Покупатель</span>
                <b>{summary.customer.fullName}</b>
              </div>
              <div className={styles.summaryRow}>
                <span>Email</span>
                <b>{summary.customer.email}</b>
              </div>
              <div className={styles.summaryRow}>
                <span>Телефон</span>
                <b>{summary.customer.phone}</b>
              </div>
              <div className={styles.summaryRow}>
                <span>Позиций</span>
                <b>{summary.itemsCount}</b>
              </div>
              <div className={styles.summaryRow}>
                <span>Промокод</span>
                <b>{summary.promoCode || "—"}</b>
              </div>
            </div>
          ) : null}

          <div className={styles.actions}>
            <Link href="/account" className={styles.primaryLink}>
              Перейти в личный кабинет
            </Link>
            <Link href="/catalog" className={styles.secondaryLink}>
              Продолжить подбор запчастей
            </Link>
            <Link href="/" className={styles.secondaryLink}>
              Вернуться в конфигуратор
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}