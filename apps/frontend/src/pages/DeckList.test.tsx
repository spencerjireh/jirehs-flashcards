import { describe, it, expect } from 'vitest';
import { render, screen, waitFor } from '../test/utils';
import { DeckList } from './DeckList';
import { createMockDeck } from '../test/factories';
import { mockTauriCommands } from '../test/mocks/tauri';

describe('DeckList', () => {
  it('should show loading state', () => {
    mockTauriCommands.list_decks.mockImplementation(() => new Promise(() => {}));

    render(<DeckList />);

    expect(screen.getByText('Loading decks...')).toBeInTheDocument();
  });

  it('should show error state with message', async () => {
    mockTauriCommands.list_decks.mockRejectedValue(new Error('Connection failed'));

    render(<DeckList />);

    await waitFor(() => {
      expect(screen.getByText(/Failed to load decks: Connection failed/)).toBeInTheDocument();
    });
  });

  it('should show empty state when no decks', async () => {
    mockTauriCommands.list_decks.mockResolvedValue([]);

    render(<DeckList />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'No decks yet' })).toBeInTheDocument();
      expect(
        screen.getByText('Import a markdown file or directory to create your first deck.')
      ).toBeInTheDocument();
    });
  });

  it('should render deck cards with stats', async () => {
    const decks = [
      createMockDeck({
        path: '/decks/spanish',
        name: 'Spanish Vocabulary',
        card_count: 100,
        new_count: 20,
        due_count: 15,
      }),
      createMockDeck({
        path: '/decks/math',
        name: 'Math Formulas',
        card_count: 50,
        new_count: 10,
        due_count: 5,
      }),
    ];
    mockTauriCommands.list_decks.mockResolvedValue(decks);

    render(<DeckList />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Your Decks' })).toBeInTheDocument();
    });

    expect(screen.getByText('Spanish Vocabulary')).toBeInTheDocument();
    expect(screen.getByText('100')).toBeInTheDocument();
    expect(screen.getByText('20')).toBeInTheDocument();
    expect(screen.getByText('15')).toBeInTheDocument();

    expect(screen.getByText('Math Formulas')).toBeInTheDocument();
    expect(screen.getByText('50')).toBeInTheDocument();
  });

  it('should link to study pages with encoded paths', async () => {
    const deck = createMockDeck({
      path: '/decks/my deck',
      name: 'My Deck',
    });
    mockTauriCommands.list_decks.mockResolvedValue([deck]);

    render(<DeckList />);

    await waitFor(() => {
      expect(screen.getByText('My Deck')).toBeInTheDocument();
    });

    const link = screen.getByRole('link', { name: /My Deck/ });
    expect(link).toHaveAttribute('href', '/study/%2Fdecks%2Fmy%20deck');
  });

  it('should render correct class names', async () => {
    const deck = createMockDeck();
    mockTauriCommands.list_decks.mockResolvedValue([deck]);

    const { container } = render(<DeckList />);

    await waitFor(() => {
      expect(container.querySelector('.deck-list')).toBeInTheDocument();
    });

    expect(container.querySelector('.decks')).toBeInTheDocument();
    expect(container.querySelector('.deck-card')).toBeInTheDocument();
    expect(container.querySelector('.deck-name')).toBeInTheDocument();
    expect(container.querySelector('.deck-stats')).toBeInTheDocument();
  });

  it('should display stat labels', async () => {
    const deck = createMockDeck();
    mockTauriCommands.list_decks.mockResolvedValue([deck]);

    render(<DeckList />);

    await waitFor(() => {
      expect(screen.getByText('cards')).toBeInTheDocument();
      expect(screen.getByText('new')).toBeInTheDocument();
      expect(screen.getByText('due')).toBeInTheDocument();
    });
  });
});
