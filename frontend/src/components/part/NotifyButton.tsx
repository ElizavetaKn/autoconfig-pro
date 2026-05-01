"use client";

import { useEffect, useState } from "react";
import styles from "./NotifyButton.module.css";

const NOTIFY_KEY = "autoconfig_stock_notifications_v1";

type Props = {
  partId: number;
  title: string;
};

type NotifyItem = {
  partId: number;
  title: string;
  createdAt: string;
};

function readNotifications(): NotifyItem[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(NOTIFY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeNotifications(items: NotifyItem[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(NOTIFY_KEY, JSON.stringify(items));
}

export function NotifyButton({ partId, title }: Props) {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const items = readNotifications();
    setEnabled(items.some((item) => item.partId === partId));
  }, [partId]);

  const toggle = () => {
    const items = readNotifications();
    const exists = items.some((item) => item.partId === partId);

    if (exists) {
      writeNotifications(items.filter((item) => item.partId !== partId));
      setEnabled(false);
      return;
    }

    writeNotifications([
      {
        partId,
        title,
        createdAt: new Date().toISOString(),
      },
      ...items,
    ]);

    setEnabled(true);
  };

  return (
    <button
      type="button"
      className={`${styles.button} ${enabled ? styles.buttonActive : ""}`}
      onClick={toggle}
    >
      {enabled ? "Уведомление включено" : "Уведомить о поступлении"}
    </button>
  );
}