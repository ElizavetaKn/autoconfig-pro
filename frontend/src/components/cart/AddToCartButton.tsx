// src/components/cart/AddToCartButton.tsx
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { CART_UPDATED_EVENT, addToCart, readCart, type VehicleContext } from "@/lib/cart";
import styles from "./AddToCartButton.module.css";

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
    sourceType?: "part" | "configuration";
  };
  vehicleContext?: VehicleContext;
};

function getCartQty(itemId: number) {
  const found = readCart().find((x) => x.id === itemId);
  return found?.qty ?? 0;
}

export function AddToCartButton({ item, vehicleContext }: Props) {
  const router = useRouter();
  const [statusText, setStatusText] = useState("");
  const [cartQty, setCartQty] = useState(0);
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    const syncQty = () => {
      setCartQty(getCartQty(item.id));
    };

    syncQty();
    window.addEventListener("storage", syncQty);
    window.addEventListener(CART_UPDATED_EVENT, syncQty as EventListener);

    return () => {
      window.removeEventListener("storage", syncQty);
      window.removeEventListener(CART_UPDATED_EVENT, syncQty as EventListener);

      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current);
      }
    };
  }, [item.id]);

  const setTempStatus = (text: string) => {
    setStatusText(text);

    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = window.setTimeout(() => {
      setStatusText("");
    }, 1800);
  };

  const addCurrentItem = () => {
    const updated = addToCart(
      {
        ...item,
        sourceType: item.sourceType ?? "part",
        vehicleContext,
      },
      1
    );

    const found = updated.find((x) => x.id === item.id);
    setCartQty(found?.qty ?? 0);
  };

  const onAdd = () => {
    addCurrentItem();
    setTempStatus("Добавлено в корзину ✓");
  };

  const onBuyNow = () => {
    addCurrentItem();
    router.push("/cart");
  };

  return (
    <div className={styles.wrapper}>
      <button type="button" onClick={onAdd} className={styles.primaryButton}>
        Добавить в корзину
      </button>

      <div className={styles.secondaryRow}>
        <button type="button" onClick={onBuyNow} className={styles.secondaryButton}>
          Купить сейчас
        </button>

        <Link href="/cart" className={styles.linkButton}>
          Перейти в корзину
        </Link>
      </div>

      <div className={styles.metaRow}>
        {cartQty > 0 ? (
          <span className={styles.statusBadge}>В корзине: {cartQty}</span>
        ) : (
          <span className={styles.statusHint}>Товар ещё не добавлен</span>
        )}

        <span className={styles.statusText}>{statusText}</span>
      </div>
    </div>
  );
}