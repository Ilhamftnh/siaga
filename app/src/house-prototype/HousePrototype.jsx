import { useEffect, useRef, useState } from 'react';
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

// Guided live demo. Each step is deterministic and needs no network.
const STEPS = [
  { act: 'demo/start', label: 'Start baseline inspection', phase: 'Pre-handover baseline inspection' },
  { act: 'demo/baseline', label: 'Complete handover inspection', phase: 'Baseline recorded, keys handed over' },
  { act: 'demo/defect', label: 'Simulate defect development', phase: 'Months after handover (simulated)' },
  { act: 'demo/anomaly', label: 'Trigger sensor anomaly', phase: 'Reading departs from the baseline' },
  { act: 'demo/alert', label: 'Send resident alert', phase: 'Resident alerted' },
  { act: 'demo/workorder', label: 'Create technician work order', phase: 'Work order created' },
  { act: 'demo/inspect', label: 'Complete inspection', phase: 'Inspected on site' },
  { act: 'demo/resolve', label: 'Resolve maintenance issue', phase: 'Repaired, new baseline' },
];
const CHECKS = [
  'Hub powered and on Wi-Fi',
  'Leak sensor, kitchen sink: dry, responding',
  'Leak sensor, bathroom basin: dry, responding',
  'Leak sensor, laundry: dry, responding',
  'Crack at window W3 photographed',
  'Crack monitor fitted across it: 0.00 mm',
];
const FLOW = ['Sensor', 'ESP32 node', 'Hub', 'SIAGA cloud', 'Resident app', 'Technician app'];
const FLOW_ON = { 1: [0, 1, 2], 2: [0, 1, 2, 3], 3: [0, 1, 2, 3], 4: [0, 1, 2, 3], 5: [3, 4], 6: [3, 5], 7: [5, 3, 4], 8: [5, 3, 4] };
const GROW_TO = 0.62; // mm of simulated movement in the defect step

// The physical house demonstration. It owns the simulated hardware inputs only:
// no resident navigation and no technician screens live here.
export default function HousePrototype() {
  const { state, dispatch } = useStore();
  const [view, setView] = useState('outside');
  const [scanIdx, setScanIdx] = useState(-1);
  const [growing, setGrowing] = useState(false);
  const timer = useRef(null);
  useEffect(() => { document.title = 'SIAGA house prototype'; }, []);
  useEffect(() => () => clearInterval(timer.current), []);
  const dv = state.devices;
  const crack = dv['crack-w3'];
  const hubOn = dv.hub.online;
  const step = state.demo ? state.demo.step : 0;
  const leaks3d = Object.fromEntries(LEAKS.map(([id, k]) => [k, !dv[id].online || !hubOn ? (dv[id].wet ? 'wet' : 'off') : dv[id].wet ? 'wet' : 'dry']));
  const reading = lastReading(crack);
  const events = state.events.slice(0, 7);
  const scanning = step === 1 && scanIdx < CHECKS.length;
  const busy = scanning || growing;

  function run(i) {
    const s = STEPS[i];
    clearInterval(timer.current);
    if (s.act === 'demo/start') {
      dispatch({ type: 'demo/start' });
      setView('inside'); setScanIdx(0); setGrowing(false);
      let k = 0;
      timer.current = setInterval(() => { k += 1; setScanIdx(k); if (k >= CHECKS.length) clearInterval(timer.current); }, 850);
      return;
    }
    dispatch({ type: s.act });
    if (s.act === 'demo/baseline') setView('crack');
    if (s.act === 'demo/defect') {
      setView('crack'); setGrowing(true);
      const t0 = performance.now();
      timer.current = setInterval(() => {
        const k = Math.min(1, (performance.now() - t0) / 6000);
        dispatch({ type: 'sim/crack', mm: +(GROW_TO * k).toFixed(2) });
        if (k >= 1) { clearInterval(timer.current); setGrowing(false); }
      }, 250);
    }
    if (s.act === 'demo/alert' || s.act === 'demo/workorder') setView('inside');
    if (s.act === 'demo/resolve') setView('crack');
  }
  function reset() {
    clearInterval(timer.current); setScanIdx(-1); setGrowing(false);
    dispatch({ type: 'reset' }); setView('outside');
  }

  const anomaly = crack.anomaly;
  const alertRoom = step >= 4 && step < 8 ? 'living' : null;
  const flowOn = FLOW_ON[step] || [];

  return (
    <>
      <DemoBar current="house" />
      <div className="hp">
        <div className="hp-stage">
          <House3D leaks={leaks3d} hubOn={hubOn} crackMm={state.sim.crackMm} monitored={crack.installed} view={view} setView={setView}
            scan={scanning} alertRoom={alertRoom} />
          <div className="hp-plan" aria-hidden="true"><FloorPlan floor="ground" devices={dv} compact /></div>

          {step > 0 && (
            <div className="hp-phase" role="status">
              <span className="xs">Step {step} of 8</span>
              <b>{STEPS[step - 1].phase}</b>
            </div>
          )}
          {step === 2 && <div className="hp-stamp" role="status"><Icon name="check" size={18} />Baseline recorded</div>}
          {step >= 4 && step < 8 && (
            <div className="hp-banner" role="alert">
              <Icon name="alert" size={18} />
              <div><b>Potential crack detected: inspection required</b><span>Living room, window W3. {step >= 7 ? 'Movement confirmed on site.' : 'Not yet inspected.'}</span></div>
            </div>
          )}
          {crack.installed && (
            <div className={'hp-readout' + (anomaly ? ' over' : '')} aria-live="polite">
              <span className="xs">Crack monitor W3</span>
              <div className="num"><span>Baseline <b>0.00</b></span><span>Now <b>{(reading ?? 0).toFixed(2)}</b></span><span>Limit <b>{crack.limit.toFixed(2)}</b> mm</span></div>
            </div>
          )}
          {step > 0 && (
            <ol className="hp-flow" aria-label="Data flow">
              {FLOW.map((f, i) => <li key={f} className={flowOn.includes(i) ? 'on' : ''}>{f}</li>)}
            </ol>
          )}
        </div>

        <aside className="hp-rail" aria-label="Sensor simulation">
          <header className="hp-head">
            <h1>House prototype</h1>
            <p>No. 12, Jalan Siaga 3. The sensors here are simulated; the controls stand in for the ESP32 hardware. Changes reach the resident and technician apps open in other tabs.</p>
          </header>

          <section className="hp-sec">
            <div className="hp-sec-head"><h2>Live demo</h2><button type="button" className="linkbtn" onClick={reset}><Icon name="refresh" size={15} />Reset</button></div>
            <ol className="hp-steps">
              {STEPS.map((s, i) => {
                const done = step > i;
                const next = step === i;
                return (
                  <li key={s.act} className={done ? 'done' : next ? 'next' : ''}>
                    <button type="button" disabled={!next || busy} onClick={() => run(i)}>
                      <span className="hp-n">{done ? <Icon name="check" size={14} /> : i + 1}</span>{s.label}
                    </button>
                  </li>
                );
              })}
            </ol>
            {step === 1 && (
              <ul className="hp-checks" aria-label="Baseline checklist">
                {CHECKS.map((c, i) => <li key={c} className={scanIdx > i ? 'ok' : scanIdx === i ? 'now' : ''}><Icon name={scanIdx > i ? 'check' : 'dot'} size={14} />{c}</li>)}
              </ul>
            )}
            {step === 3 && <p className="xs muted">{growing ? 'Wall movement increasing…' : `Movement reached ${state.sim.crackMm.toFixed(2)} mm. The monitor has recorded it; no alert is raised until the anomaly check runs.`}</p>}
            {step === 8 && <p className="xs muted">Scenario complete. Reset to run it again.</p>}
            {step === 0 && <p className="xs muted">Runs the full story: baseline before handover, a defect months later, alert, work order, inspection and repair.</p>}
          </section>

          <details className="hp-sec hp-manual">
            <summary><h2>Manual sensor controls</h2></summary>
            <ul className="hp-list">
              {LEAKS.map(([id]) => {
                const d = dv[id];
                const s = deviceState(d, hubOn);
                return (
                  <li key={id} className="hp-item">
                    <div className="hp-item-top">
                      <div><b>{d.spot}</b><span className="xs muted">{s.text} · {d.power === 'wired' ? 'wired 5 V' : 'battery'}</span></div>
                      <button type="button" className={'water' + (d.wet ? ' on' : '')} aria-pressed={d.wet} onClick={() => dispatch({ type: 'sim/leak', id, wet: !d.wet })}>
                        <Icon name="drop" size={16} />{d.wet ? 'Dry it' : 'Add water'}
                      </button>
                    </div>
                    <label className="hp-online"><Switch checked={d.online} label={`${d.spot} sensor powered`} onChange={(v) => dispatch({ type: 'sim/online', id, online: v })} /><span className="small">Powered and connected</span></label>
                  </li>
                );
              })}
            </ul>
            <label className="small" htmlFor="mv">Wall movement at W3 <b className="num">{state.sim.crackMm.toFixed(2)} mm</b></label>
            <input id="mv" type="range" min="0" max="1.5" step="0.01" value={state.sim.crackMm}
              onChange={(e) => { dispatch({ type: 'sim/crack', mm: Number(e.target.value) }); if (view !== 'crack') setView('crack'); }} />
            {crack.installed ? (
              <p className="small">Crack monitor fitted. Recording <b className="num">{(reading ?? 0).toFixed(2)} mm</b> against a {crack.limit} mm limit {crack.over && <Badge tone="bad">Above limit</Badge>}</p>
            ) : (
              <p className="small muted">No crack monitor fitted, so movement is not being recorded.</p>
            )}
            <p className="xs muted">Stands in for a Hall-effect sensor and magnet across the crack, read by an ESP32. It is not a building-grade crackmeter.</p>
            <label className="hp-online"><Switch checked={hubOn} label="Hub powered and on Wi-Fi" onChange={(v) => dispatch({ type: 'sim/online', id: 'hub', online: v })} /><span className="small">Hub powered and on Wi-Fi</span></label>
          </details>

          <section className="hp-sec">
            <h2>Sensor log</h2>
            <ol className="hp-log">
              {events.map((e) => <li key={e.id}><span className="num">{fmtTime(e.at)}</span><span>{dv[e.deviceId] ? dv[e.deviceId].spot + ': ' : ''}{e.text}</span></li>)}
            </ol>
          </section>

          <footer className="hp-foot">
            <a href={href('system')}><Icon name="hub" size={16} />Sensors, wiring, AI and costs</a>
            <a href={href('app/resident')} target="_blank" rel="noreferrer"><Icon name="external" size={16} />Open the resident app in a new tab</a>
            <a href={href('app/technician')} target="_blank" rel="noreferrer"><Icon name="external" size={16} />Open the technician app in a new tab</a>
          </footer>
        </aside>
      </div>
    </>
  );
}
