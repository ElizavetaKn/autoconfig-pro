// src/components/ui/SectionHeader.tsx
import Link from "next/link";
import styles from "./SectionHeader.module.css";

type SectionHeaderProps = {
  title: string;
  backHref?: string;
  backLabel?: string;
  tone?: "light" | "dark";
};

export function SectionHeader({
  title,
  backHref,
  backLabel,
  tone = "light",
}: SectionHeaderProps) {
  const headerClass =
    tone === "dark" ? `${styles.header} ${styles.headerDark}` : styles.header;

  const backClass =
    tone === "dark" ? `${styles.back} ${styles.backDark}` : styles.back;

  const titleClass =
    tone === "dark" ? `${styles.title} ${styles.titleDark}` : styles.title;

  return (
    <div className={headerClass}>
      {backHref && backLabel ? (
        <Link href={backHref} className={backClass}>
          {backLabel}
        </Link>
      ) : null}

      <h1 className={titleClass}>{title}</h1>
    </div>
  );
}