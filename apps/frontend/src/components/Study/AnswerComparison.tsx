import type { CompareAnswerResponse, DiffSegment } from '@jirehs-flashcards/shared-types';
import styles from './AnswerComparison.module.css';

interface AnswerComparisonProps {
  result: CompareAnswerResponse;
  correctAnswer: string;
}

export function AnswerComparison({ result, correctAnswer }: AnswerComparisonProps) {
  const matchingModeLabel =
    result.matching_mode === 'exact'
      ? 'Exact'
      : result.matching_mode === 'case_insensitive'
      ? 'Case Insensitive'
      : 'Fuzzy';

  return (
    <div className={styles['answer-comparison']}>
      <div className={styles['comparison-header']}>
        <span className={`${styles['comparison-result']} ${result.is_correct ? styles.correct : styles.incorrect}`}>
          {result.is_correct ? 'Correct!' : 'Incorrect'}
        </span>
        {result.matching_mode === 'fuzzy' && (
          <span className={styles['comparison-similarity']}>
            {Math.round(result.similarity * 100)}% match
          </span>
        )}
      </div>

      <div className={styles['comparison-section']}>
        <div className={styles['comparison-label']}>Your Answer</div>
        <div className={styles['comparison-diff']}>
          {result.diff.map((segment, index) => (
            <DiffSpan key={index} segment={segment} />
          ))}
        </div>
      </div>

      <div className={styles['comparison-section']}>
        <div className={styles['comparison-label']}>Correct Answer</div>
        <div className={styles['comparison-text']}>{correctAnswer}</div>
      </div>

      <div className={styles['comparison-mode']}>
        Matching: {matchingModeLabel}
      </div>
    </div>
  );
}

function DiffSpan({ segment }: { segment: DiffSegment }) {
  const className =
    segment.diff_type === 'Same'
      ? styles['diff-same']
      : segment.diff_type === 'Added'
      ? styles['diff-added']
      : styles['diff-removed'];

  return <span className={className}>{segment.text} </span>;
}
