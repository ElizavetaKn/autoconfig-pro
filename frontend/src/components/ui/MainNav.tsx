"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { CART_UPDATED_EVENT, readCart } from "@/lib/cart";
import styles from "./MainNav.module.css";

type MainNavProps = {
  active?:
    | "home"
    | "configurator"
    | "catalog"
    | "account"
    | "admin"
    | "manager"
    | "login"
    | "register";
};

type UserRole = "user" | "manager" | "admin" | null;

function CartNavIcon() {
  return (
    <svg viewBox="0 0 24 24" className={styles.navSvgIcon} aria-hidden="true">
      <path d="M3.5 4.5h2.2l2.2 10.8a2 2 0 0 0 2 1.6h7.7a2 2 0 0 0 1.9-1.4l1.7-6.8H8.2" />
      <circle cx="10" cy="20" r="1.6" />
      <circle cx="18" cy="20" r="1.6" />
    </svg>
  );
}

function UserNavIcon() {
  return (
    <svg viewBox="0 0 24 24" className={styles.navSvgIcon} aria-hidden="true">
      <circle cx="12" cy="7.8" r="3.6" />
      <path d="M5 20.5c1-4.8 3.9-7.3 7-7.3s6 2.5 7 7.3" />
    </svg>
  );
}

function readRoleFromStorage(): UserRole {
  if (typeof window === "undefined") return null;

  const directRole =
    window.localStorage.getItem("autoconfig_role_v1") ||
    window.sessionStorage.getItem("autoconfig_role_v1");

  if (directRole === "admin" || directRole === "manager" || directRole === "user") {
    return directRole;
  }

  const possibleUserKeys = [
    "autoconfig_user_v1",
    "autoconfig_current_user_v1",
    "autoconfig_auth_v1",
  ];

  for (const key of possibleUserKeys) {
    const raw =
      window.localStorage.getItem(key) ||
      window.sessionStorage.getItem(key);

    if (!raw) continue;

    try {
      const parsed = JSON.parse(raw);
      const role = parsed?.role || parsed?.user?.role;

      if (role === "admin" || role === "manager" || role === "user") {
        return role;
      }
    } catch {
      continue;
    }
  }

  return null;
}

export function MainNav({ active }: MainNavProps) {
  const router = useRouter();
  const [cartCount, setCartCount] = useState(0);
  const [role, setRole] = useState<UserRole>(null);

  const isStaff = role === "admin" || role === "manager" || active === "admin" || active === "manager";
  const hideAuthControls = active === "login" || active === "register";

  const staffCabinetHref = useMemo(() => {
    if (role === "admin" || active === "admin") return "/admin";
    if (role === "manager" || active === "manager") return "/manager";
    return "/account";
  }, [role, active]);

  useEffect(() => {
    setRole(readRoleFromStorage());

    const syncRole = () => setRole(readRoleFromStorage());

    window.addEventListener("focus", syncRole);
    window.addEventListener("storage", syncRole);

    return () => {
      window.removeEventListener("focus", syncRole);
      window.removeEventListener("storage", syncRole);
    };
  }, []);

  useEffect(() => {
    if (isStaff) {
      setCartCount(0);
      return;
    }

    const syncCartCount = () => {
      const count = readCart().reduce((sum, item) => sum + item.qty, 0);
      setCartCount(count);
    };

    syncCartCount();

    window.addEventListener("focus", syncCartCount);
    window.addEventListener("storage", syncCartCount);
    window.addEventListener(CART_UPDATED_EVENT, syncCartCount as EventListener);

    return () => {
      window.removeEventListener("focus", syncCartCount);
      window.removeEventListener("storage", syncCartCount);
      window.removeEventListener(CART_UPDATED_EVENT, syncCartCount as EventListener);
    };
  }, [isStaff]);

  function handleLogout() {
    if (typeof window === "undefined") return;

    const keysToRemove = [
      "autoconfig_auth_v1",
      "autoconfig_user_v1",
      "autoconfig_profile_v1",
      "autoconfig_session_v1",
      "autoconfig_logged_in_v1",
      "autoconfig_role_v1",
      "autoconfig_current_user_v1",
      "autoconfig_default_vehicle_v1",
    ];

    keysToRemove.forEach((key) => {
      window.localStorage.removeItem(key);
      window.sessionStorage.removeItem(key);
    });

    router.push("/login");
    router.refresh();
  }

  return (
    <header className={styles.nav}>
      <div className={styles.inner}>
        <Link href="/" className={styles.brand}>
          <span className={styles.brandMain}>AutoConfig</span>
          <span className={styles.brandAccent}> PRO</span>
        </Link>

        <nav className={styles.links}>
          <Link href="/" className={`${styles.link} ${active === "home" ? styles.linkActive : ""}`}>
            Главная
          </Link>

          {isStaff ? (
            <Link
              href={staffCabinetHref}
              className={`${styles.link} ${
                active === "admin" || active === "manager" ? styles.linkActive : ""
              }`}
            >
              Личный кабинет
            </Link>
          ) : (
            <>
              <Link
                href="/configurator"
                className={`${styles.link} ${active === "configurator" ? styles.linkActive : ""}`}
              >
                Конфигуратор
              </Link>

              <Link
                href="/catalog"
                className={`${styles.link} ${active === "catalog" ? styles.linkActive : ""}`}
              >
                Каталог запчастей
              </Link>
            </>
          )}
        </nav>

        <div className={styles.actions}>
          <ThemeToggle />

          {!hideAuthControls && (
            <>
              {!isStaff ? (
                <>
                  <Link href="/cart" className={styles.iconButton} aria-label="Корзина" title="Корзина">
                    <CartNavIcon />
                    {cartCount > 0 ? <span className={styles.cartBadge}>{cartCount}</span> : null}
                  </Link>

                  <Link
                    href="/account"
                    className={styles.iconButton}
                    aria-label="Личный кабинет"
                    title="Личный кабинет"
                  >
                    <UserNavIcon />
                  </Link>
                </>
              ) : (
                <Link
                  href={staffCabinetHref}
                  className={styles.iconButton}
                  aria-label="Личный кабинет"
                  title="Личный кабинет"
                >
                  <UserNavIcon />
                </Link>
              )}

              <button type="button" className={styles.logoutButton} onClick={handleLogout}>
                Выйти
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}