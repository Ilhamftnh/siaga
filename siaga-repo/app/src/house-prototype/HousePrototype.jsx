import { useEffect, useState } from 'react';
import { useStore, deviceState, lastReading } from '../shared/services/store.jsx';
import { href } from '../shared/services/router.js';
import { fmtTime } from '../shared/services/format.js';
import { DemoBar } from '../application/shared/Shell.jsx';
import Icon from '../application/shared/Icon.jsx';
import { Switch, Badge } from '../application/shared/ui.jsx';
import { FloorPlan } from '../application/shared/visuals.jsx';
import House3D from './House3D.jsx';
import '../styles/house.css';

const LEAKS = [['leak-kitchen', 'kitchen'], ['leak-basin', 'basin'], ['leak-laundry', 'laundry']];

// The physical house demonstration. It owns the simulated hardware inputs only:
// no resident navigation and no technician screens live here.
export default function HousePrototype() {
  const { state, dispatch } = useStore();
  const [view, setView] = useState('outside');
  useEffect(() => { document.title = 'SIAGA house prototype'; }, []);
  const dv = state.devices;
  const crack = dv['crack-w3'];
  const hubOn = dv.hub.online;
  const leaks3d = Object.fromEntries(LEAKS.map(([id, k]) => [k, !dv[id].online || !hubOn ? (dv[id].wet ? 'wet' : 'off') : dv[id].wet ? 'wet' : 'dry']));
  const reading = lastReading(crack);
  const events = state.events.slice(0, 7);

  return (
    <>
      <DemoBar current="house" />
      <div className="hp">
        <div className="hp-stage">
          <House3D leaks={leaks3d} hubOn={hubOn} crackMm={state.sim.crackMm} monitored={crack.installed} view={view} setView={setView} />
          <div className="hp-plan" aria-hidden="true"><FloorPlan floor="ground" devices={dv} compact /></div>
        </div>

        <aside className="hp-rail" aria-label="Sensor simulation">
          <header className="hp-head">
            <h1>House prototype</h1>
            <p>No. 12, Jalan Siaga 3. These controls stand in for the ESP32 sensors until hardware is connected. Changes reach the resident and technician apps open in other tabs.</p>
          </header>

          <section className="hp-sec">
            <h2>Leak sensors</h2>
            <ul className="hp-list">
              {LEAKS.map(([id]) => {
                const d = dv[id];
                const s = deviceState(d, hubOn);
                return (
                  <li key={id} className="hp-item">
                    <div className="hp-item-top">
                      <div><b>{d.spot}</b><span className="xs muted">{s.text}</span></div>
                      <button type="button" className={'water' + (d.wet ? ' on' : '')} aria-pressed={d.wet} onClick={() => dispatch({ type: 'sim/leak', id, wet: !d.wet })}>
                        <Icon name="drop" size={16} />{d.wet ? 'Dry it' : 'Add water'}
                      </button>
                    </div>
                    <label className="hp-online"><Switch checked={d.online} label={`${d.spot} sensor powered`} onChange={(v) => dispatch({ type: 'sim/online', id, online: v })} /><span className="small">Powered and connected</span></label>
                  </li>
                );
              })}
            </ul>
          </section>

          <section className="hp-sec">
            <h2>Crack at window W3</h2>
            <label className="small" htmlFor="mv">Wall movement <b className="num">{state.sim.crackMm.toFixed(2)} mm</b></label>
            <input id="mv" type="range" min="0" max="1.5" step="0.01" value={state.sim.crackMm}
              onChange={(e) => { dispatch({ type: 'sim/crack', mm: Number(e.target.value) }); if (view !== 'crack') setView('crack'); }} />
            {crack.installed ? (
              <p className="small">Crack monitor fitted. Recording <b className="num">{(reading ?? 0).toFixed(2)} mm</b> against a {crack.limit} mm limit {crack.over && <Badge tone="bad">Above limit</Badge>}</p>
            ) : (
              <p className="small muted">No crack monitor fitted, so movement is not being recorded. A technician fits one from a crack work order.</p>
            )}
            <p className="xs muted">Stands in for a slide potentiometer on the ESP32. It is not a building-grade crackmeter.</p>
          </section>

          <section className="hp-sec">
            <h2>Hub</h2>
            <label className="hp-online"><Switch checked={hubOn} label="Hub powered and on Wi-Fi" onChange={(v) => dispatch({ type: 'sim/online', id: 'hub', online: v })} /><span className="small">Powered and on Wi-Fi</span></label>
          </section>

          <section className="hp-sec">
            <h2>Sensor log</h2>
            <ol className="hp-log">
              {events.map((e) => <li key={e.id}><span className="num">{fmtTime(e.at)}</span><span>{dv[e.deviceId] ? dv[e.deviceId].spot + ': ' : ''}{e.text}</span></li>)}
            </ol>
          </section>

          <footer className="hp-foot">
            <a href={href('app/resident')} target="_blank" rel="noreferrer"><Icon name="external" size={16} />Open the resident app in a new tab</a>
            <a href={href('app/technician')} target="_blank" rel="noreferrer"><Icon name="external" size={16} />Open the technician app in a new tab</a>
          </footer>
        </aside>
      </div>
    </>
  );
}
