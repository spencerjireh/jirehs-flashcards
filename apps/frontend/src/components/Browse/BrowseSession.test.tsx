import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor, userEvent } from '../../test/utils';
import { BrowseSession } from './BrowseSession';
import { createMockCard, resetIdCounter } from '../../test/factories';
import { mockTauriCommands } from '../../test/mocks/tauri';

describe('BrowseSession', () => {
  const mockCards = [
    createMockCard({ id: 1, question: 'Q1', answer: 'A1' }),
    createMockCard({ id: 2, question: 'Q2', answer: 'A2' }),
    createMockCard({ id: 3, question: 'Q3', answer: 'A3' }),
  ];

  beforeEach(() => {
    resetIdCounter();
    mockTauriCommands.get_deck_cards.mockResolvedValue(mockCards);
  });

  it('should show loading state', () => {
    mockTauriCommands.get_deck_cards.mockImplementation(() => new Promise(() => {}));
    render(<BrowseSession deckPath="/decks/test" />);
    expect(screen.getByText('Loading cards...')).toBeInTheDocument();
  });

  it('should show empty state when no cards', async () => {
    mockTauriCommands.get_deck_cards.mockResolvedValue([]);
    render(<BrowseSession deckPath="/decks/test" />);

    await waitFor(() => {
      expect(screen.getByText('No cards in this deck')).toBeInTheDocument();
    });
  });

  it('should show message when no deck path', () => {
    render(<BrowseSession />);
    expect(screen.getByText('Select a deck to browse.')).toBeInTheDocument();
  });

  it('should display card and counter', async () => {
    render(<BrowseSession deckPath="/decks/test" />);

    await waitFor(() => {
      expect(screen.getByText('Q1')).toBeInTheDocument();
    });

    expect(screen.getByText('1 / 3')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Show Answer' })).toBeInTheDocument();
  });

  it('should navigate to next card', async () => {
    const user = userEvent.setup();
    render(<BrowseSession deckPath="/decks/test" />);

    await waitFor(() => {
      expect(screen.getByText('Q1')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: 'Next card' }));

    expect(screen.getByText('Q2')).toBeInTheDocument();
    expect(screen.getByText('2 / 3')).toBeInTheDocument();
  });

  it('should navigate to previous card', async () => {
    const user = userEvent.setup();
    render(<BrowseSession deckPath="/decks/test" />);

    await waitFor(() => {
      expect(screen.getByText('Q1')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: 'Previous card' }));

    expect(screen.getByText('Q3')).toBeInTheDocument();
    expect(screen.getByText('3 / 3')).toBeInTheDocument();
  });

  it('should reveal answer on click', async () => {
    const user = userEvent.setup();
    render(<BrowseSession deckPath="/decks/test" />);

    await waitFor(() => {
      expect(screen.getByText('Q1')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: 'Show Answer' }));
    expect(screen.getByText('A1')).toBeInTheDocument();
  });

  it('should not show rating buttons after revealing', async () => {
    const user = userEvent.setup();
    render(<BrowseSession deckPath="/decks/test" />);

    await waitFor(() => {
      expect(screen.getByText('Q1')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: 'Show Answer' }));

    expect(screen.queryByRole('button', { name: 'Again' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Good' })).not.toBeInTheDocument();
  });

  it('should reset reveal state on navigation', async () => {
    const user = userEvent.setup();
    render(<BrowseSession deckPath="/decks/test" />);

    await waitFor(() => {
      expect(screen.getByText('Q1')).toBeInTheDocument();
    });

    // Reveal answer
    await user.click(screen.getByRole('button', { name: 'Show Answer' }));
    expect(screen.getByText('A1')).toBeInTheDocument();

    // Navigate to next card
    await user.click(screen.getByRole('button', { name: 'Next card' }));

    // Answer should be hidden, show answer button should be back
    expect(screen.getByRole('button', { name: 'Show Answer' })).toBeInTheDocument();
    expect(screen.queryByText('A1')).not.toBeInTheDocument();
  });
});
