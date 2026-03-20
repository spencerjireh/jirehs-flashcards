import { describe, it, expect, vi } from 'vitest';
import { render, screen, userEvent } from '../../test/utils';
import { StudyComplete } from './StudyComplete';

describe('StudyComplete', () => {
  it('should display completion message', () => {
    render(<StudyComplete />);

    expect(screen.getByRole('heading', { name: 'Session Complete' })).toBeInTheDocument();
    expect(
      screen.getByText("You've reviewed all cards for this session.")
    ).toBeInTheDocument();
  });

  it('should render restart button when callback provided', () => {
    const onRestart = vi.fn();

    render(<StudyComplete onRestart={onRestart} />);

    expect(screen.getByRole('button', { name: 'Study Again' })).toBeInTheDocument();
  });

  it('should hide restart button when callback undefined', () => {
    render(<StudyComplete />);

    expect(screen.queryByRole('button', { name: 'Study Again' })).not.toBeInTheDocument();
  });

  it('should call onRestart when restart button clicked', async () => {
    const user = userEvent.setup();
    const onRestart = vi.fn();

    render(<StudyComplete onRestart={onRestart} />);

    await user.click(screen.getByRole('button', { name: 'Study Again' }));

    expect(onRestart).toHaveBeenCalledTimes(1);
  });

  it('should render return button when callback provided', () => {
    const onReturn = vi.fn();

    render(<StudyComplete onReturn={onReturn} />);

    expect(screen.getByRole('button', { name: 'Back to Decks' })).toBeInTheDocument();
  });

  it('should call onReturn when return button clicked', async () => {
    const user = userEvent.setup();
    const onReturn = vi.fn();

    render(<StudyComplete onReturn={onReturn} />);

    await user.click(screen.getByRole('button', { name: 'Back to Decks' }));

    expect(onReturn).toHaveBeenCalledTimes(1);
  });
});
