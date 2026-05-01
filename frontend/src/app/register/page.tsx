"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { MainNav } from "@/components/ui/MainNav";
import { registerBuyerAccount, signInSession } from "@/lib/auth";
import styles from "./page.module.css";

export default function RegisterPage() {
  const router = useRouter();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [agree, setAgree] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!fullName.trim() || !email.trim() || !password.trim() || !confirmPassword.trim()) {
      setError("Заполни все поля.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Пароли не совпадают.");
      return;
    }

    if (!agree) {
      setError("Подтверди согласие с условиями пользования.");
      return;
    }

    const buyer = registerBuyerAccount({
      fullName: fullName.trim(),
      email: email.trim(),
      password: password.trim(),
    });

    signInSession({
      isAuthenticated: true,
      role: "buyer",
      fullName: buyer.fullName,
      email: buyer.email,
    });

    router.push("/account");
  };

  return (
    <main className={styles.page}>
      <div className="page-shell">
        <MainNav active="register" />

        <section className={styles.hero}>
          <div className={styles.card}>
            <h1 className={styles.title}>РЕГИСТРАЦИЯ</h1>

            <form className={styles.form} onSubmit={handleSubmit}>
              <input
                className={styles.input}
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Имя"
                autoComplete="name"
              />

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
                  autoComplete="new-password"
                />
                <span className={styles.lockIcon}>🔒</span>
              </div>

              <div className={styles.passwordField}>
                <input
                  type="password"
                  className={styles.input}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Подтверждение пароля"
                  autoComplete="new-password"
                />
                <span className={styles.lockIcon}>🔒</span>
              </div>

              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={agree}
                  onChange={(e) => setAgree(e.target.checked)}
                />
                <span>
                  Я соглашаюсь с{" "}
                  <button type="button" className={styles.linkButton}>
                    условиями пользования
                  </button>
                </span>
              </label>

              {error ? <div className={styles.error}>{error}</div> : null}

              <button type="submit" className={styles.submitButton}>
                Зарегистрироваться
              </button>
            </form>

            <div className={styles.footerNote}>
              Уже есть аккаунт?{" "}
              <Link href="/login" className={styles.inlineLink}>
                Войти
              </Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}