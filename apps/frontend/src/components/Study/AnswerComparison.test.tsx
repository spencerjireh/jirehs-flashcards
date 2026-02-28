import { describe, it, expect } from 'vitest';
import { render, screen } from '../../test/utils';
import { AnswerComparison } from './AnswerComparison';
import { createMockCompareAnswerResponse } from '../../test/factories';

describe('AnswerComparison', () => {
  it('should display Correct status when answer is correct', () => {
    const result = createMockCompareAnswerResponse({
      is_correct: true,
    });

    render(<AnswerComparison result={result} correctAnswer="test answer" />);

    expect(screen.getByText('Correct!')).toBeInTheDocument();
  });

  it('should display Incorrect status when answer is incorrect', () => {
    const result = createMockCompareAnswerResponse({
      is_correct: false,
    });

    render(<AnswerComparison result={result} correctAnswer="test answer" />);

    expect(screen.getByText('Incorrect')).toBeInTheDocument();
  });

  it('should show similarity percentage for fuzzy mode', () => {
    const result = createMockCompareAnswerResponse({
      matching_mode: 'fuzzy',
      similarity: 0.85,
    });

    render(<AnswerComparison result={result} correctAnswer="test" />);

    expect(screen.getByText('85% match')).toBeInTheDocument();
  });

  it('should hide similarity for exact mode', () => {
    const result = createMockCompareAnswerResponse({
      matching_mode: 'exact',
      similarity: 1.0,
    });

    render(<AnswerComparison result={result} correctAnswer="test" />);

    expect(screen.queryByText(/% match/)).not.toBeInTheDocument();
  });

  it('should hide similarity for case insensitive mode', () => {
    const result = createMockCompareAnswerResponse({
      matching_mode: 'case_insensitive',
      similarity: 1.0,
    });

    render(<AnswerComparison result={result} correctAnswer="test" />);

    expect(screen.queryByText(/% match/)).not.toBeInTheDocument();
  });

  it('should render all diff segment types', () => {
    const result = createMockCompareAnswerResponse({
      diff: [
        { text: 'same', diff_type: 'Same' },
        { text: 'added', diff_type: 'Added' },
        { text: 'removed', diff_type: 'Removed' },
      ],
    });

    render(<AnswerComparison result={result} correctAnswer="test" />);

    expect(screen.getByText('same')).toBeInTheDocument();
    expect(screen.getByText('added')).toBeInTheDocument();
    expect(screen.getByText('removed')).toBeInTheDocument();
  });

  it('should display correct answer text', () => {
    const result = createMockCompareAnswerResponse();
    const correctAnswer = 'This is the correct answer';

    render(<AnswerComparison result={result} correctAnswer={correctAnswer} />);

    expect(screen.getByText(correctAnswer)).toBeInTheDocument();
  });

  it('should display matching mode label for Exact', () => {
    const result = createMockCompareAnswerResponse({
      matching_mode: 'exact',
    });

    render(<AnswerComparison result={result} correctAnswer="test" />);

    expect(screen.getByText('Matching: Exact')).toBeInTheDocument();
  });

  it('should display matching mode label for Case Insensitive', () => {
    const result = createMockCompareAnswerResponse({
      matching_mode: 'case_insensitive',
    });

    render(<AnswerComparison result={result} correctAnswer="test" />);

    expect(screen.getByText('Matching: Case Insensitive')).toBeInTheDocument();
  });

  it('should display matching mode label for Fuzzy', () => {
    const result = createMockCompareAnswerResponse({
      matching_mode: 'fuzzy',
    });

    render(<AnswerComparison result={result} correctAnswer="test" />);

    expect(screen.getByText('Matching: Fuzzy')).toBeInTheDocument();
  });

  it('should display Your Answer section', () => {
    const result = createMockCompareAnswerResponse({
      diff: [{ text: 'my answer', diff_type: 'Same' }],
    });

    render(<AnswerComparison result={result} correctAnswer="test" />);

    expect(screen.getByText('Your Answer')).toBeInTheDocument();
  });

  it('should display Correct Answer section', () => {
    const result = createMockCompareAnswerResponse();

    render(<AnswerComparison result={result} correctAnswer="test" />);

    expect(screen.getByText('Correct Answer')).toBeInTheDocument();
  });
});
