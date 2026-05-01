// src/components/part/PartInfoRow.tsx
import styles from "./PartInfoRow.module.css";

type PartInfoRowProps = {
  label: string;
  value: string;
  emphasized?: boolean;
};

export function PartInfoRow({
  label,
  value,
  emphasized = false,
}: PartInfoRowProps) {
  return (
    <div className={styles.row}>
      <span className={styles.label}>{label}</span>
      <span className={emphasized ? styles.valueEmphasized : styles.value}>
        {value}
      </span>
    </div>
  );
}