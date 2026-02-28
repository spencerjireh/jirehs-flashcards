import { describe, it, expect, vi } from 'vitest';
import { render, screen, userEvent } from '../../test/utils';
import { RatingButtons } from './RatingButtons';

describe('RatingButtons', () => {
  describe('4-point scale', () => {
    it('should render all 4 rating buttons', () => {
      const onRate = vi.fn();

      render(<RatingButtons onRate={onRate} />);

      expect(screen.getByRole('button', { name: 'Again' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Hard' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Good' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Easy' })).toBeInTheDocument();
    });

    it('should call onRate with correct values', async () => {
      const user = userEvent.setup();
      const onRate = vi.fn();

      render(<RatingButtons onRate={onRate} />);

      await user.click(screen.getByRole('button', { name: 'Again' }));
      expect(onRate).toHaveBeenLastCalledWith(1);

      await user.click(screen.getByRole('button', { name: 'Hard' }));
      expect(onRate).toHaveBeenLastCalledWith(2);

      await user.click(screen.getByRole('button', { name: 'Good' }));
      expect(onRate).toHaveBeenLastCalledWith(3);

      await user.click(screen.getByRole('button', { name: 'Easy' }));
      expect(onRate).toHaveBeenLastCalledWith(4);
    });

    it('should disable all buttons when disabled prop is true', () => {
      const onRate = vi.fn();

      render(<RatingButtons onRate={onRate} disabled />);

      expect(screen.getByRole('button', { name: 'Again' })).toBeDisabled();
      expect(screen.getByRole('button', { name: 'Hard' })).toBeDisabled();
      expect(screen.getByRole('button', { name: 'Good' })).toBeDisabled();
      expect(screen.getByRole('button', { name: 'Easy' })).toBeDisabled();
    });

    it('should not call onRate when disabled', async () => {
      const user = userEvent.setup();
      const onRate = vi.fn();

      render(<RatingButtons onRate={onRate} disabled />);

      await user.click(screen.getByRole('button', { name: 'Good' }));

      expect(onRate).not.toHaveBeenCalled();
    });

  });

  describe('2-point scale', () => {
    it('should delegate to TwoPointRatingButtons when scale is 2point', () => {
      const onRate = vi.fn();

      render(<RatingButtons onRate={onRate} ratingScale="2point" />);

      expect(screen.getByRole('button', { name: 'Wrong' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Correct' })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Again' })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Hard' })).not.toBeInTheDocument();
    });
  });
});
