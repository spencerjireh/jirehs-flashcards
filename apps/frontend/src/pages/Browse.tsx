import { useParams } from 'react-router-dom';
import { DeckModeLayout } from '../components/DeckMode/DeckModeLayout';
import { BrowseSession } from '../components/Browse/BrowseSession';

export function Browse() {
  const { deckPath } = useParams<{ deckPath: string }>();
  const decodedPath = deckPath ? decodeURIComponent(deckPath) : undefined;

  return (
    <DeckModeLayout mode="browse">
      <div className="browse-page">
        {decodedPath && <h1 className="study-title">{decodedPath}</h1>}
        <BrowseSession deckPath={decodedPath} />
      </div>
    </DeckModeLayout>
  );
}
