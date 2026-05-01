"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { createServiceRequest } from "@/lib/api";
import { addToCart } from "@/lib/cart";
import styles from "./PartActions.module.css";

const INSTALL_REQUESTS_KEY = "autoconfig_install_requests_v1";

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

type Props = {
  item: {
    id: number;
    title: string;
    category: string;
    brand: string;
    price: number;
    condition?: string;
    originality?: string;
    cross_brand?: boolean;
  };
  vehicleContext?: {
    brandId?: number | null;
    modelId?: number | null;
    year?: number | null;
    bodyType?: string;
    query?: string;
    condition?: string;
    originality?: string;
    crossBrand?: boolean;
  };
  hideStatusBox?: boolean;
};

function ModalPortal({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  if (!mounted || typeof document === "undefined") {
    return null;
  }

  return createPortal(children, document.body);
}

export function PartActions({
  item,
  vehicleContext,
  hideStatusBox = false,
}: Props) {
  const [showInstructions, setShowInstructions] = useState(false);
  const [showInstallForm, setShowInstallForm] = useState(false);
  const [serviceCenter, setServiceCenter] = useState("Центр AutoConfig Минск");
  const [customerName, setCustomerName] = useState("");
  const [phone, setPhone] = useState("");
  const [comment, setComment] = useState("");
  const [status, setStatus] = useState("");
  const [unsafeConfirm, setUnsafeConfirm] = useState(false);

  const hasVehicleContext = useMemo(() => {
    return Boolean(
      vehicleContext?.brandId &&
        vehicleContext?.modelId &&
        vehicleContext?.year &&
        vehicleContext?.bodyType
    );
  }, [vehicleContext]);

  const helperText = hasVehicleContext
    ? "Контекст автомобиля сохранится вместе с товаром."
    : "Автомобиль не выбран. Совместимость не подтверждена.";

  useEffect(() => {
    const modalOpen = showInstructions || showInstallForm;
    const previousOverflow = document.body.style.overflow;

    if (modalOpen) {
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [showInstructions, showInstallForm]);

  const handleAddToCart = () => {
    if (!hasVehicleContext && !unsafeConfirm) {
      setUnsafeConfirm(true);
      setStatus("Нажми ещё раз, если хочешь добавить товар без подтверждённой совместимости.");
      return;
    }

    addToCart(
      {
        id: item.id,
        title: item.title,
        category: item.category,
        brand: item.brand,
        price: item.price,
        condition: item.condition,
        originality: item.originality,
        cross_brand: item.cross_brand,
        sourceType: "part",
        vehicleContext: hasVehicleContext ? vehicleContext : undefined,
      },
      1
    );

    setUnsafeConfirm(false);
    setStatus(
      hasVehicleContext
        ? "Товар добавлен в корзину."
        : "Товар добавлен в корзину без подтверждённой совместимости."
    );
  };

  const closeModals = () => {
    setShowInstructions(false);
    setShowInstallForm(false);
  };

  const saveInstallRequestToLocalStorage = () => {
    const raw = window.localStorage.getItem(INSTALL_REQUESTS_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    const next = Array.isArray(parsed) ? parsed : [];

    next.unshift({
      id: Date.now(),
      status: "new",
      created_at: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      serviceCenter,
      customerName: customerName.trim(),
      phone: phone.trim(),
      comment: comment.trim(),
      itemId: item.id,
      itemTitle: item.title,
      vehicleContext,
    });

    window.localStorage.setItem(INSTALL_REQUESTS_KEY, JSON.stringify(next));
  };

  const submitInstallRequest = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!customerName.trim()) {
      setStatus("Укажи имя для записи на установку.");
      return;
    }

    if (!phone.trim()) {
      setStatus("Укажи телефон для записи на установку.");
      return;
    }

    if (!isValidPhone(phone)) {
      setStatus("Укажи корректный телефон: 10–15 цифр, можно с +, пробелами, скобками или дефисами.");
      return;
    }

    try {
      try {
        await createServiceRequest({
          serviceCenter,
          customerName: customerName.trim(),
          phone: phone.trim(),
          comment: comment.trim(),
          itemId: item.id,
          itemTitle: item.title,
          vehicleContext,
        });
      } catch {
        saveInstallRequestToLocalStorage();
      }

      setCustomerName("");
      setPhone("");
      setComment("");
      setShowInstallForm(false);
      setStatus("Заявка на установку успешно отправлена. Специалист свяжется с вами для подтверждения записи.");
    } catch {
      setStatus("Не удалось сохранить заявку.");
    }
  };

  return (
    <>
      <div className={styles.wrapper}>
        {!hideStatusBox ? (
          <div className={hasVehicleContext ? styles.helperOk : styles.helperWarn}>
            {helperText}
          </div>
        ) : null}

        <div className={styles.primaryActions}>
          <button type="button" className={styles.primaryButton} onClick={handleAddToCart}>
            Добавить в корзину
          </button>

          <Link href="/cart" className={styles.buyNowLink}>
            Перейти в корзину
          </Link>
        </div>

        <div className={styles.linksRow}>
          <button
            type="button"
            className={styles.linkButton}
            onClick={() => setShowInstructions(true)}
          >
            Инструкция по установке
          </button>

          <button
            type="button"
            className={styles.linkButton}
            onClick={() => setShowInstallForm(true)}
          >
            Записаться на установку
          </button>
        </div>

        {status ? <div className={styles.statusText}>{status}</div> : null}
      </div>

      {showInstructions ? (
        <ModalPortal>
          <div className={styles.modalOverlay} onClick={closeModals}>
            <div
              className={`${styles.modalCard} ${styles.instructionsModal}`}
              onClick={(e) => e.stopPropagation()}
            >
              <div className={styles.modalHeader}>
                <div className={styles.modalTitle}>Инструкция по установке</div>
                <button type="button" className={styles.closeButton} onClick={closeModals}>
                  ✕
                </button>
              </div>

              <ol className={styles.instructionsList}>
                <li>Проверь артикул и совместимость детали с выбранным автомобилем.</li>
                <li>Подготовь инструмент и рабочее место перед демонтажом старой детали.</li>
                <li>Сними старую деталь по регламенту производителя автомобиля.</li>
                <li>Очисти посадочные места и проверь состояние крепежа.</li>
                <li>Установи новую деталь и выполни контрольную проверку.</li>
                <li>После установки проверь работу узла на тестовом запуске или в движении.</li>
              </ol>

              <div className={styles.modalHint}>
                Позже сюда можно подключить PDF, схему или видео именно для этой детали.
              </div>
            </div>
          </div>
        </ModalPortal>
      ) : null}

      {showInstallForm ? (
        <ModalPortal>
          <div className={styles.modalOverlay} onClick={closeModals}>
            <form
              className={`${styles.modalCard} ${styles.formModal}`}
              onClick={(e) => e.stopPropagation()}
              onSubmit={submitInstallRequest}
            >
              <div className={styles.modalHeader}>
                <div className={styles.modalTitle}>Запись на установку</div>
                <button type="button" className={styles.closeButton} onClick={closeModals}>
                  ✕
                </button>
              </div>

              <label className={styles.field}>
                <span>Сервисный центр</span>
                <select
                  className={styles.select}
                  value={serviceCenter}
                  onChange={(e) => setServiceCenter(e.target.value)}
                >
                  <option>Центр AutoConfig Минск</option>
                  <option>Центр AutoConfig Гомель</option>
                  <option>Центр AutoConfig Брест</option>
                </select>
              </label>

              <label className={styles.field}>
                <span>Имя</span>
                <input
                  className={styles.input}
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Ваше имя"
                />
              </label>

              <label className={styles.field}>
                <span>Телефон</span>
                <input
                  className={styles.input}
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+375..."
                />
              </label>

              <label className={styles.field}>
                <span>Комментарий</span>
                <textarea
                  className={styles.textarea}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Удобное время, пожелания, комментарии"
                  rows={4}
                />
              </label>

              <button type="submit" className={styles.submitButton}>
                Сохранить заявку
              </button>
            </form>
          </div>
        </ModalPortal>
      ) : null}
    </>
  );
}