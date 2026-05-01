import Link from "next/link";
import { MainNav } from "@/components/ui/MainNav";
import styles from "./page.module.css";

function ToolsIcon() {
  return (
    <svg viewBox="0 0 64 64" className={styles.cardIcon} aria-hidden="true">
      <path d="M21 12 13 20l9 9 8-8" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M42 10c-3 0-6 1-8 3l-5 5 17 17 5-5c2-2 3-5 3-8l-8 4-8-8 4-8Z" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M18 48 48 18" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      <path d="m38 40 12 12" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      <path d="m45 43 10 10-4 4-10-10" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CarIcon() {
  return (
    <svg viewBox="0 0 64 64" className={styles.cardIcon} aria-hidden="true">
      <path d="M14 38h36l-3-9a6 6 0 0 0-6-4H23a6 6 0 0 0-6 4l-3 9Z" fill="none" stroke="currentColor" strokeWidth="3" />
      <path d="M11 38h42v8a4 4 0 0 1-4 4H15a4 4 0 0 1-4-4v-8Z" fill="none" stroke="currentColor" strokeWidth="3" />
      <circle cx="20" cy="50" r="4" fill="none" stroke="currentColor" strokeWidth="3" />
      <circle cx="44" cy="50" r="4" fill="none" stroke="currentColor" strokeWidth="3" />
    </svg>
  );
}

function CartIcon() {
  return (
    <svg viewBox="0 0 64 64" className={styles.cardIcon} aria-hidden="true">
      <path d="M12 14h6l5 26h25l6-18H23" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="28" cy="50" r="4" fill="none" stroke="currentColor" strokeWidth="3" />
      <circle cx="46" cy="50" r="4" fill="none" stroke="currentColor" strokeWidth="3" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg viewBox="0 0 64 64" className={styles.cardIcon} aria-hidden="true">
      <circle cx="32" cy="20" r="9" fill="none" stroke="currentColor" strokeWidth="3" />
      <path d="M16 52c2-10 10-16 16-16s14 6 16 16" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

const quickLinks = [
  { title: "Каталог\nзапчастей", href: "/catalog", icon: <ToolsIcon /> },
  { title: "Конфигуратор\nавтомобилей", href: "/configurator", icon: <CarIcon /> },
  { title: "Корзина\nпокупок", href: "/cart", icon: <CartIcon /> },
  { title: "Личный\nкабинет", href: "/account", icon: <UserIcon /> },
];

export default function HomePage() {
  return (
    <main className={styles.page}>
      <MainNav active="home" />

      <div className={styles.shell}>
        <section className={styles.hero}>
          <div className={styles.heroText}>
            <h1 className={styles.title}>
              <span>ОНЛАЙН КОНФИГУРАТОР</span>
              <span>АВТОМОБИЛЕЙ</span>
            </h1>

            <p className={styles.subtitle}>
              Подберите комплектацию автомобиля по его характеристикам и опциям
            </p>

            <div className={styles.heroActions}>
              <Link href="/configurator" className={styles.primaryButton}>
                КОНФИГУРАТОР
              </Link>

              <Link href="/catalog" className={styles.secondaryButton}>
                ПОДБОР ПО VIN
              </Link>
            </div>
          </div>

          <div className={styles.heroVisual}>
            <div className={styles.visualGlow} />
            <div className={styles.carImage} aria-hidden="true" />
          </div>
        </section>

        <section className={styles.quickGrid}>
          {quickLinks.map((item) => (
            <Link key={item.href} href={item.href} className={styles.quickCard}>
              <div className={styles.quickIconWrap}>{item.icon}</div>
              <div className={styles.quickTitle}>
                {item.title.split("\n").map((line) => (
                  <span key={line}>{line}</span>
                ))}
              </div>
            </Link>
          ))}
        </section>
      </div>
    </main>
  );
}