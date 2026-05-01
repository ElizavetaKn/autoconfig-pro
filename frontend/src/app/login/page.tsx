"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { MainNav } from "@/components/ui/MainNav";
import { loginWithCredentials } from "@/lib/auth";
import styles from "./page.module.css";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState("");

  const next = searchParams.get("next") || "";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim() || !password.trim()) {
      setError("Заполни email и пароль.");
      return;
    }

    const result = loginWithCredentials({
      email: email.trim(),
      password: password.trim(),
    });

    if (!result.ok) {
      setError(result.message);
      return;
    }

    if (rememberMe) {
      window.localStorage.setItem("autoconfig_remember_email_v1", email.trim());
    } else {
      window.localStorage.removeItem("autoconfig_remember_email_v1");
    }

    if (next) {
      router.push(next);
      return;
    }

    if (result.session.role === "admin") {
      router.push("/admin");
      return;
    }

    if (result.session.role === "manager") {
      router.push("/manager");
      return;
    }

    router.push("/account");
  };

  return (
    <main className={styles.page}>
      <div className="page-shell">
        <MainNav active="login" />

        <section className={styles.hero}>
          <div className={styles.card}>
            <h1 className={styles.title}>ВХОД</h1>

            <form className={styles.form} onSubmit={handleSubmit}>
              <input
                className={styles.input}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="E-mail"
                autoComplete="email"
              />

              <div className={styles.passwordField}>
                <input
                  type="password"
                  className={styles.input}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Пароль"
                  autoComplete="current-password"
                />
                <span className={styles.lockIcon}>🔒</span>
              </div>

              <div className={styles.row}>
                <label className={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                  />
                  <span>Запомнить меня</span>
                </label>

                <button type="button" className={styles.linkButton}>
                  Забыли пароль?
                </button>
              </div>

              {error ? <div className={styles.error}>{error}</div> : null}

              <button type="submit" className={styles.submitButton}>
                Войти
              </button>
            </form>

            <div className={styles.footerNote}>
              Нет аккаунта?{" "}
              <Link href="/register" className={styles.inlineLink}>
                Зарегистрироваться
              </Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}