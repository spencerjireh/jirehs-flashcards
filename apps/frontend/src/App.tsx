import { IconoirProvider } from 'iconoir-react';
import { Shell } from './components/Shell/Shell';
import './styles.css';

function App() {
  return (
    <IconoirProvider iconProps={{ strokeWidth: 1.25 }}>
      <Shell />
    </IconoirProvider>
  );
}

export default App;
