import { useEffect, useState } from 'react';
import { useStore } from './store.jsx';
import { DEMO_HOME, LEAK_SENSORS } from './data/seed.js';
import { loadModel, modelStatus } from './ai/crackModel.js';
import House3D from './components/House3D.jsx';
import Homeowner from './views/Homeowner.jsx';
import Technician from './views/Technician.jsx';
import Management from './views/Management.jsx';

const ROLES = [['home', 'Homeowner'], ['tech', 'Technician'], ['mgmt', 'Property management']];

export default function App() {
  const { state, dispatch } = useStore();
  const [role, setRole] = useState('home');
  const [view, setView] = useState('outside');
  const [ms, setMs] = useState(modelStatus().status);
  useEffect(() => { loadModel().then(() => setMs(modelStatus().status)); }, []);

  const monitored = state.reports.some((r) => r.home === DEMO_HOME && r.status === 'monitor');
  const chip = { ready: ['ok', 'Crack model loaded'], loading: ['warn', 'Loading crack model…'], missing: ['warn', 'Crack model not loaded: sample mode'], error: ['bad', 'Crack model failed to load'], unchecked: ['warn', 'Checking for crack model…'] }[ms];

  return (
    <div className="app">
      <header className="top">
        <div className="brand"><b>SIAGA</b><span>Detect early. Monitor smarter. Live safer.</span></div>
        <nav className="roles" aria-label="Choose a view">
          {ROLES.map(([k, t]) => <button key={k} aria-pressed={role === k} onClick={() => setRole(k)}>{t}</button>)}
        </nav>
        <span className={'chip ' + chip[0]} title={modelStatus().error || undefined}>{chip[1]}</span>
      </header>
      <p className="proto">Prototype. Sensors are simulated with the demo controls; no hardware is connected. Proposed as an enhancement to the Sime Darby Property App, not affiliated with or endorsed by Sime Darby Property.</p>

      {role === 'mgmt' ? <Management /> : (
        <div className="stagegrid">
          <div className="left">
            <House3D leaks={state.leaks} crackMm={state.crackMm} monitored={monitored} view={view} setView={setView} />
            <section className="sim card">
              <div className="simhead"><b>Simulated sensor input</b><span className="muted small">Stands in for the ESP32 until hardware is connected</span></div>
              <div className="simgrid">
                {LEAK_SENSORS.map((s) => (
                  <label key={s.id} className="switch">
                    <input type="checkbox" checked={state.leaks[s.id]} onChange={(e) => { dispatch({ type: 'leak', sensor: s.id, wet: e.target.checked }); if (e.target.checked) setView('inside'); }} />
                    <span>{s.name}: <b className={state.leaks[s.id] ? 'tx-bad' : 'tx-ok'}>{state.leaks[s.id] ? 'wet' : 'dry'}</b></span>
                  </label>
                ))}
              </div>
              <label className="lbl" htmlFor="crackmm">Crack movement (stands in for the crack displacement sensor): <b>{state.crackMm.toFixed(2)} mm</b></label>
              <input id="crackmm" type="range" min="0" max="1.5" step="0.01" value={state.crackMm}
                onChange={(e) => { dispatch({ type: 'crack', mm: Number(e.target.value) }); if (view !== 'crack') setView('crack'); }} />
              <span className="muted small">{monitored ? 'A crack monitor is fitted, so readings are recorded every 2 seconds.' : 'Readings are recorded once a technician chooses "Fit crack monitor" on a crack report.'}</span>
            </section>
          </div>
          <div className="phone"><div className="phone-in">{role === 'home' ? <Homeowner /> : <Technician />}</div></div>
        </div>
      )}
    </div>
  );
}
