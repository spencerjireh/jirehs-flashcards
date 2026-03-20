import styles from './AmbientProgress.module.css';

interface AmbientProgressProps {
  remaining: number;
  total: number;
  visible: boolean;
}

export function AmbientProgress({ remaining, total, visible }: AmbientProgressProps) {
  const ratio = total > 0 ? remaining / total : 0;

  return (
    <div className={styles.ambient} data-visible={visible || undefined}>
      <div className={styles.layers}>
        <div
          className={styles.layer}
          style={{ opacity: ratio > 0.6 ? 0.3 : 0 }}
        />
        <div
          className={styles.layer}
          style={{ opacity: ratio > 0.3 ? 0.5 : 0 }}
        />
        <div
          className={styles.layer}
          style={{ opacity: remaining > 0 ? 0.8 : 0.2 }}
        />
      </div>
      <span className={styles.count}>{remaining} left</span>
    </div>
  );
}
