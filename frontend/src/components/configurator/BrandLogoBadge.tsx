"use client";

import styles from "./BrandLogoBadge.module.css";

type Props = {
  brandName: string;
  modelName: string;
  bodyType: string;
};

function getBrandKey(brandName: string) {
  const value = brandName.toLowerCase();

  if (value.includes("bmw")) return "bmw";
  if (value.includes("audi")) return "audi";
  if (value.includes("mercedes")) return "mercedes";
  if (value.includes("toyota")) return "toyota";

  return "generic";
}

function BMWLogo() {
  return (
    <svg viewBox="0 0 100 100" className={styles.logoSvg} aria-hidden="true">
      <circle cx="50" cy="50" r="46" fill="#0d1117" stroke="#e8eef5" strokeWidth="4" />
      <circle cx="50" cy="50" r="31" fill="#ffffff" stroke="#e8eef5" strokeWidth="3" />
      <path d="M50 19 A31 31 0 0 1 81 50 L50 50 Z" fill="#4ca4ff" />
      <path d="M19 50 A31 31 0 0 1 50 19 L50 50 Z" fill="#ffffff" />
      <path d="M50 81 A31 31 0 0 1 19 50 L50 50 Z" fill="#4ca4ff" />
      <path d="M81 50 A31 31 0 0 1 50 81 L50 50 Z" fill="#ffffff" />
      <circle cx="50" cy="50" r="9" fill="#0d1117" />
    </svg>
  );
}

function AudiLogo() {
  return (
    <svg viewBox="0 0 180 60" className={styles.logoSvgWide} aria-hidden="true">
      {[28, 64, 100, 136].map((cx, idx) => (
        <circle
          key={idx}
          cx={cx}
          cy="30"
          r="18"
          fill="none"
          stroke="#e8eef5"
          strokeWidth="4"
        />
      ))}
    </svg>
  );
}

function MercedesLogo() {
  return (
    <svg viewBox="0 0 100 100" className={styles.logoSvg} aria-hidden="true">
      <circle cx="50" cy="50" r="42" fill="none" stroke="#e8eef5" strokeWidth="4" />
      <path d="M50 18 L50 50" stroke="#e8eef5" strokeWidth="4" strokeLinecap="round" />
      <path d="M50 50 L24 66" stroke="#e8eef5" strokeWidth="4" strokeLinecap="round" />
      <path d="M50 50 L76 66" stroke="#e8eef5" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}

function ToyotaLogo() {
  return (
    <svg viewBox="0 0 130 100" className={styles.logoSvgWide} aria-hidden="true">
      <ellipse cx="65" cy="50" rx="48" ry="28" fill="none" stroke="#e8eef5" strokeWidth="4" />
      <ellipse cx="65" cy="50" rx="16" ry="28" fill="none" stroke="#e8eef5" strokeWidth="4" />
      <ellipse cx="65" cy="50" rx="34" ry="12" fill="none" stroke="#e8eef5" strokeWidth="4" />
    </svg>
  );
}

function GenericLogo() {
  return <div className={styles.genericMark}>AC</div>;
}

export function BrandLogoBadge({ brandName, modelName, bodyType }: Props) {
  const brandKey = getBrandKey(brandName);

  return (
    <div className={styles.card}>
      <div className={styles.logoWrap}>
        {brandKey === "bmw" ? <BMWLogo /> : null}
        {brandKey === "audi" ? <AudiLogo /> : null}
        {brandKey === "mercedes" ? <MercedesLogo /> : null}
        {brandKey === "toyota" ? <ToyotaLogo /> : null}
        {brandKey === "generic" ? <GenericLogo /> : null}
      </div>

      <div className={styles.meta}>
        <div className={styles.brand}>{brandName || "Марка"}</div>
        <div className={styles.model}>{modelName || "Модель"}</div>
        <div className={styles.body}>{bodyType || "Тип кузова не выбран"}</div>
      </div>
    </div>
  );
}