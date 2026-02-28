import { describe, it, expect, vi } from 'vitest';
import { render, screen, userEvent } from '../../test/utils';
import { Card } from './Card';
import { createMockCard } from '../../test/factories';

describe('Card', () => {
  it('should always display the question', () => {
    const card = createMockCard({ question: 'What is 2 + 2?' });
    const onReveal = vi.fn();

    render(<Card card={card} revealed={false} onReveal={onReveal} />);

    expect(screen.getByText('Question')).toBeInTheDocument();
    expect(screen.getByText('What is 2 + 2?')).toBeInTheDocument();
  });

  it('should show reveal button when not revealed', () => {
    const card = createMockCard({ answer: '4' });
    const onReveal = vi.fn();

    render(<Card card={card} revealed={false} onReveal={onReveal} />);

    expect(screen.getByRole('button', { name: 'Show Answer' })).toBeInTheDocument();
    expect(screen.queryByText('4')).not.toBeInTheDocument();
  });

  it('should show answer when revealed', () => {
    const card = createMockCard({ answer: '4' });
    const onReveal = vi.fn();

    render(<Card card={card} revealed={true} onReveal={onReveal} />);

    expect(screen.getByText('Answer')).toBeInTheDocument();
    expect(screen.getByText('4')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Show Answer' })).not.toBeInTheDocument();
  });

  it('should call onReveal when button is clicked', async () => {
    const user = userEvent.setup();
    const card = createMockCard();
    const onReveal = vi.fn();

    render(<Card card={card} revealed={false} onReveal={onReveal} />);

    await user.click(screen.getByRole('button', { name: 'Show Answer' }));

    expect(onReveal).toHaveBeenCalledTimes(1);
  });

});
