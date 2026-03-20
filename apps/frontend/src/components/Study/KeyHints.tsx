import { useState, useEffect } from 'react';
import styles from './KeyHints.module.css';

interface KeyHintsProps {
  revealed: boolean;
  visible: boolean;
}

export function KeyHints({ revealed, visible }: KeyHintsProps) {
  const [activeKey, setActiveKey] = useState<string | null>(null);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const key = e.key.toLowerCase();
      if (['j', 'k', 'l', ';', ' '].includes(key)) {
        setActiveKey(key === ' ' ? 'space' : key);
        setTimeout(() => setActiveKey(null), 300);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className={styles.hints} data-visible={visible || undefined}>
      <div
        className={styles.hint}
        data-dimmed={revealed || undefined}
        data-active={activeKey === 'space' || undefined}
      >
        <kbd>Space</kbd> flip
      </div>
      <div
        className={styles.hint}
        data-dimmed={!revealed || undefined}
        data-active={activeKey === 'j' || undefined}
      >
        <kbd>J</kbd> again
      </div>
      <div
        className={styles.hint}
        data-dimmed={!revealed || undefined}
        data-active={activeKey === 'k' || undefined}
      >
        <kbd>K</kbd> hard
      </div>
      <div
        className={styles.hint}
        data-dimmed={!revealed || undefined}
        data-active={activeKey === 'l' || undefined}
      >
        <kbd>L</kbd> good
      </div>
      <div
        className={styles.hint}
        data-dimmed={!revealed || undefined}
        data-active={activeKey === ';' || undefined}
      >
        <kbd>;</kbd> easy
      </div>
    </div>
  );
}
