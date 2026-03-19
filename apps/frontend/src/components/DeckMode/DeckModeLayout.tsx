import type { ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

type DeckMode = 'study' | 'browse';

interface DeckModeLayoutProps {
  mode: DeckMode;
  children: ReactNode;
}

export function DeckModeLayout({ mode, children }: DeckModeLayoutProps) {
  const navigate = useNavigate();
  const { deckPath } = useParams<{ deckPath: string }>();

  const switchMode = (newMode: DeckMode) => {
    if (newMode === mode || !deckPath) return;
    navigate(`/${newMode}/${deckPath}`, { replace: true });
  };

  return (
    <div className="deck-mode-layout">
      <div className="deck-mode-tabs">
        <button
          type="button"
          className={`deck-mode-tab${mode === 'study' ? ' active' : ''}`}
          onClick={() => switchMode('study')}
        >
          Study
        </button>
        <button
          type="button"
          className={`deck-mode-tab${mode === 'browse' ? ' active' : ''}`}
          onClick={() => switchMode('browse')}
        >
          Browse
        </button>
      </div>
      {children}
    </div>
  );
}
