import { lazy, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { StoreProvider } from './shared/services/store.jsx';
import { useRoute } from './shared/services/router.js';
import { ToastProvider } from './application/shared/ui.jsx';
import Launcher from './Launcher.jsx';
import './styles/base.css';
import './styles/app.css';

// Separate products, loaded on demand
const HousePrototype = lazy(() => import('./house-prototype/HousePrototype.jsx'));
const ResidentApp = lazy(() => import('./application/resident/ResidentApp.jsx'));
const SystemPage = lazy(() => import('./system/SystemPage.jsx'));
const TechnicianApp = lazy(() => import('./application/technician/TechnicianApp.jsx'));

function Root() {
  const [a, b] = useRoute();
  let View = Launcher;
  if (a === 'house') View = HousePrototype;
  else if (a === 'system') View = SystemPage;
  else if (a === 'app' && b === 'technician') View = TechnicianApp;
  else if (a === 'app') View = ResidentApp;
  return <Suspense fallback={<div className="loading">Loading…</div>}><View /></Suspense>;
}

createRoot(document.getElementById('root')).render(
  <StoreProvider ticks>
    <ToastProvider>
      <Root />
    </ToastProvider>
  </StoreProvider>,
);
