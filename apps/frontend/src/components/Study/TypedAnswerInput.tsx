import { useRef, useEffect } from 'react';
import { Check } from 'iconoir-react';
import styles from './TypedAnswerInput.module.css';

interface TypedAnswerInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  disabled?: boolean;
}

export function TypedAnswerInput({
  value,
  onChange,
  onSubmit,
  disabled = false,
}: TypedAnswerInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current && !disabled) {
      textareaRef.current.focus();
    }
  }, [disabled]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (value.trim()) {
        onSubmit();
      }
    }
  };

  return (
    <div className={styles['typed-answer-input']}>
      <textarea
        ref={textareaRef}
        className={`form-input ${styles['typed-answer-textarea']}`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Type your answer..."
        disabled={disabled}
        rows={3}
      />
      <button
        type="button"
        className={`button button-icon ${styles['typed-answer-submit']}`}
        onClick={onSubmit}
        disabled={disabled || !value.trim()}
      >
        <Check /> Check Answer
      </button>
    </div>
  );
}
