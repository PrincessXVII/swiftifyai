import { AppLayout } from './components/layout/AppLayout';
import { useSmoothWheel } from './hooks/useSmoothWheel';

function App() {
  useSmoothWheel();
  return <AppLayout />;
}

export default App;
