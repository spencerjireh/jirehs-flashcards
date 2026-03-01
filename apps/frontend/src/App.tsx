import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { IconoirProvider } from 'iconoir-react';
import { Layout } from './components/Layout/Layout';
import { DeckList } from './pages/DeckList';
import { Study } from './pages/Study';
import { Settings } from './pages/Settings';
import { Stats } from './pages/Stats';
import { useWatcherEvents } from './hooks/useWatcherEvents';
import './styles.css';

function AppContent() {
  useWatcherEvents();

  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<DeckList />} />
        <Route path="study" element={<Study />} />
        <Route path="study/:deckPath" element={<Study />} />
        <Route path="settings" element={<Settings />} />
        <Route path="stats" element={<Stats />} />
        <Route path="stats/:deckPath" element={<Stats />} />
      </Route>
    </Routes>
  );
}

function App() {
  return (
    <IconoirProvider iconProps={{ strokeWidth: 1.25 }}>
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </IconoirProvider>
  );
}

export default App;
