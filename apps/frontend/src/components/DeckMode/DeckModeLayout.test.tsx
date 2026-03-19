import { describe, it, expect } from 'vitest';
import { render, screen, userEvent } from '../../test/utils';
import { DeckModeLayout } from './DeckModeLayout';
import { Routes, Route } from 'react-router-dom';

function renderWithRoutes(initialPath: string) {
  return render(
    <Routes>
      <Route
        path="study/:deckPath"
        element={
          <DeckModeLayout mode="study">
            <div>Study Content</div>
          </DeckModeLayout>
        }
      />
      <Route
        path="browse/:deckPath"
        element={
          <DeckModeLayout mode="browse">
            <div>Browse Content</div>
          </DeckModeLayout>
        }
      />
    </Routes>,
    {
      routerProps: { initialEntries: [initialPath] },
    }
  );
}

describe('DeckModeLayout', () => {
  it('should render both tabs', () => {
    renderWithRoutes('/study/test-deck');

    expect(screen.getByRole('button', { name: 'Study' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Browse' })).toBeInTheDocument();
  });

  it('should mark Study tab as active on study route', () => {
    renderWithRoutes('/study/test-deck');

    expect(screen.getByRole('button', { name: 'Study' })).toHaveClass('active');
    expect(screen.getByRole('button', { name: 'Browse' })).not.toHaveClass('active');
  });

  it('should mark Browse tab as active on browse route', () => {
    renderWithRoutes('/browse/test-deck');

    expect(screen.getByRole('button', { name: 'Browse' })).toHaveClass('active');
    expect(screen.getByRole('button', { name: 'Study' })).not.toHaveClass('active');
  });

  it('should render children', () => {
    renderWithRoutes('/study/test-deck');
    expect(screen.getByText('Study Content')).toBeInTheDocument();
  });

  it('should navigate to browse when Browse tab is clicked', async () => {
    const user = userEvent.setup();
    renderWithRoutes('/study/test-deck');

    await user.click(screen.getByRole('button', { name: 'Browse' }));

    expect(screen.getByText('Browse Content')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Browse' })).toHaveClass('active');
  });

  it('should navigate to study when Study tab is clicked', async () => {
    const user = userEvent.setup();
    renderWithRoutes('/browse/test-deck');

    await user.click(screen.getByRole('button', { name: 'Study' }));

    expect(screen.getByText('Study Content')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Study' })).toHaveClass('active');
  });
});
