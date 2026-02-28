import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, userEvent } from '../../test/utils';
import { StudySession } from './StudySession';
import { useStudyStore } from '../../stores/studyStore';
import {
  createMockCard,
  createMockStudyQueue,
  createMockEffectiveSettings,
  createMockCompareAnswerResponse,
} from '../../test/factories';
import { mockTauriCommands } from '../../test/mocks/tauri';

describe('StudySession', () => {
  beforeEach(() => {
    useStudyStore.setState({
      currentIndex: 0,
      revealed: false,
      startTime: null,
      answerMode: 'flip',
      typedAnswer: '',
      compareResult: null,
    });

    mockTauriCommands.get_effective_settings.mockResolvedValue(
      createMockEffectiveSettings()
    );
  });

  it('should show loading state', () => {
    mockTauriCommands.get_study_queue.mockImplementation(() => new Promise(() => {}));

    render(<StudySession deckPath="/decks/test" />);

    expect(screen.getByText('Loading cards...')).toBeInTheDocument();
  });

  it('should show completion screen when queue is empty', async () => {
    mockTauriCommands.get_study_queue.mockResolvedValue(
      createMockStudyQueue()
    );

    render(<StudySession deckPath="/decks/test" />);

    // Empty queue means isComplete is true (0 >= 0), so StudyComplete renders
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Session Complete' })).toBeInTheDocument();
    });
  });

  it('should display card question in flip mode', async () => {
    const card = createMockCard({ question: 'What is React?' });
    mockTauriCommands.get_study_queue.mockResolvedValue(
      createMockStudyQueue({ new_cards: [card] })
    );

    render(<StudySession deckPath="/decks/test" />);

    await waitFor(() => {
      expect(screen.getByText('What is React?')).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: 'Show Answer' })).toBeInTheDocument();
  });

  it('should reveal answer and show rating buttons in flip mode', async () => {
    const user = userEvent.setup();
    const card = createMockCard({ question: 'Q1', answer: 'A1' });
    mockTauriCommands.get_study_queue.mockResolvedValue(
      createMockStudyQueue({ new_cards: [card] })
    );

    render(<StudySession deckPath="/decks/test" />);

    await waitFor(() => {
      expect(screen.getByText('Q1')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: 'Show Answer' }));

    expect(screen.getByText('A1')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Again' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Good' })).toBeInTheDocument();
  });

  it('should advance to next card after rating', async () => {
    const user = userEvent.setup();
    const card1 = createMockCard({ id: 1, question: 'Q1', answer: 'A1' });
    const card2 = createMockCard({ id: 2, question: 'Q2', answer: 'A2' });
    mockTauriCommands.get_study_queue.mockResolvedValue(
      createMockStudyQueue({ new_cards: [card1, card2] })
    );
    mockTauriCommands.submit_review.mockResolvedValue({
      new_state: { status: 'learning', interval_days: 1, ease_factor: 2.5, lapses: 0, reviews_count: 1 },
      next_due: new Date().toISOString(),
    });

    render(<StudySession deckPath="/decks/test" />);

    await waitFor(() => {
      expect(screen.getByText('Q1')).toBeInTheDocument();
    });

    // Reveal and rate
    await user.click(screen.getByRole('button', { name: 'Show Answer' }));
    await user.click(screen.getByRole('button', { name: 'Good' }));

    await waitFor(() => {
      expect(screen.getByText('Q2')).toBeInTheDocument();
    });
  });

  it('should show completion screen when all cards reviewed', async () => {
    const user = userEvent.setup();
    const card = createMockCard({ id: 1, question: 'Q1', answer: 'A1' });
    mockTauriCommands.get_study_queue.mockResolvedValue(
      createMockStudyQueue({ new_cards: [card] })
    );
    mockTauriCommands.submit_review.mockResolvedValue({
      new_state: { status: 'learning', interval_days: 1, ease_factor: 2.5, lapses: 0, reviews_count: 1 },
      next_due: new Date().toISOString(),
    });

    render(<StudySession deckPath="/decks/test" />);

    await waitFor(() => {
      expect(screen.getByText('Q1')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: 'Show Answer' }));
    await user.click(screen.getByRole('button', { name: 'Good' }));

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Session Complete' })).toBeInTheDocument();
    });
  });

  it('should toggle to typed mode and show text input', async () => {
    const user = userEvent.setup();
    const card = createMockCard({ question: 'Capital of France?' });
    mockTauriCommands.get_study_queue.mockResolvedValue(
      createMockStudyQueue({ new_cards: [card] })
    );

    render(<StudySession deckPath="/decks/test" />);

    await waitFor(() => {
      expect(screen.getByText('Capital of France?')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: 'Switch to Typed' }));

    expect(screen.getByPlaceholderText('Type your answer...')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Switch to Flip' })).toBeInTheDocument();
  });

  it('should submit typed answer and show comparison', async () => {
    const user = userEvent.setup();
    const card = createMockCard({ question: 'Capital of France?', answer: 'Paris' });
    mockTauriCommands.get_study_queue.mockResolvedValue(
      createMockStudyQueue({ new_cards: [card] })
    );
    mockTauriCommands.compare_typed_answer.mockResolvedValue(
      createMockCompareAnswerResponse({
        is_correct: true,
        typed_normalized: 'paris',
        correct_normalized: 'paris',
        diff: [{ text: 'paris', diff_type: 'Same' }],
      })
    );

    // Start in typed mode
    useStudyStore.setState({ answerMode: 'typed' });

    render(<StudySession deckPath="/decks/test" />);

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Type your answer...')).toBeInTheDocument();
    });

    await user.type(screen.getByPlaceholderText('Type your answer...'), 'Paris');
    await user.click(screen.getByRole('button', { name: 'Check Answer' }));

    await waitFor(() => {
      expect(screen.getByText('Correct!')).toBeInTheDocument();
    });

    // Rating buttons should appear
    expect(screen.getByRole('button', { name: 'Good' })).toBeInTheDocument();
  });

  it('should show 2-point rating buttons when settings use 2point scale', async () => {
    const user = userEvent.setup();
    const card = createMockCard({ question: 'Q1', answer: 'A1' });
    mockTauriCommands.get_study_queue.mockResolvedValue(
      createMockStudyQueue({ new_cards: [card] })
    );
    mockTauriCommands.get_effective_settings.mockResolvedValue(
      createMockEffectiveSettings({ rating_scale: '2point' })
    );

    render(<StudySession deckPath="/decks/test" />);

    await waitFor(() => {
      expect(screen.getByText('Q1')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: 'Show Answer' }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Wrong' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Correct' })).toBeInTheDocument();
    });

    expect(screen.queryByRole('button', { name: 'Again' })).not.toBeInTheDocument();
  });

  it('should display progress', async () => {
    const cards = [
      createMockCard({ id: 1, question: 'Q1' }),
      createMockCard({ id: 2, question: 'Q2' }),
      createMockCard({ id: 3, question: 'Q3' }),
    ];
    mockTauriCommands.get_study_queue.mockResolvedValue(
      createMockStudyQueue({ new_cards: cards })
    );

    render(<StudySession deckPath="/decks/test" />);

    await waitFor(() => {
      expect(screen.getByText('0 / 3')).toBeInTheDocument();
    });
  });
});
