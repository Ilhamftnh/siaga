import { useState } from 'react';
import { useStore, fmtTime } from '../store.jsx';
import { DEMO_HOME, LEAK_SENSORS, BASELINE } from '../data/seed.js';
import { GUIDANCE, WARNING_SIGNS, COSTS, LEAK_GUIDANCE, CONF_SHOW, CONF_MIN, CLASSES } from '../data/guidance.js';
import { detect, modelStatus } from '../ai/crackModel.js';
import { makeSample, shrink, loadImage } from '../data/samplePhotos.js';
import { Pill, Tag, MoveChart, AiPhoto } from '../components/Bits.jsx';

const sensorName = (id) => (LEAK_SENSORS.find((s) => s.id === id) || {}).name || id;

export default function Homeowner() {
  const { state, dispatch } = useStore();
  const [nav, setNav] = useState({ screen: 'home' });
  const go = (screen, extra = {}) => setNav({ screen, ...extra });

  const mine = state.reports.filter((r) => r.home === DEMO_HOME);
  const active = state.alerts.filter((a) => !a.cleared || !a.reportId).filter((a) => !a.dismissed);
  const openAlerts = state.alerts.filter((a) => !a.cleared);
  const monitored = mine.find((r) => r.status === 'monitor');
  const lastMm = monitored && monitored.readings && monitored.readings.length ? monitored.readings[monitored.readings.length - 1].mm : null;
  const overLimit = monitored && lastMm != null && lastMm > monitored.limitMm;

  let body;
  if (nav.screen === 'alert') {
    const a = state.alerts.find((x) => x.id === nav.id);
    body = a ? <LeakAlert a={a} go={go} dispatch={dispatch} /> : null;
  } else if (nav.screen === 'check') {
    body = <CrackCheck go={go} dispatch={dispatch} />;
  } else if (nav.screen === 'report') {
    const r = state.reports.find((x) => x.id === nav.id);
    body = r ? <ReportDetail r={r} go={go} /> : null;
  } else if (nav.screen === 'reports') {
    body = (
      <div className="screen">
        <button className="back" onClick={() => go('home')}>Back</button>
        <h1 className="h1">My reports</h1>
        {mine.length === 0 && <p className="muted">No reports yet.</p>}
        {mine.map((r) => (
          <button key={r.id} className="card row-card" onClick={() => go('report', { id: r.id })}>
            <span className="eyebrow">{r.id} · {fmtTime(r.created)}</span>
            <b>{r.title}</b>
            <Pill status={r.status} />
          </button>
        ))}
      </div>
    );
  } else if (nav.screen === 'baseline') {
    body = <Baseline go={go} />;
  } else {
    body = (
      <div className="screen">
        <div>
          <div className="eyebrow">No. 12, Jalan Siaga 3 · sample home</div>
          <h1 className="h1">Your home</h1>
        </div>
        {openAlerts.map((a) => (
          <button key={a.id} className="card alert bad" onClick={() => go('alert', { id: a.id })}>
            <span className="eyebrow">Leak sensor alert · {fmtTime(a.at)}</span>
            <b className="big">Water detected: {sensorName(a.sensor)}</b>
            <span>Tap to see what to do.</span>
          </button>
        ))}
        {overLimit && (
          <button className="card alert warn" onClick={() => go('report', { id: monitored.id })}>
            <span className="eyebrow">Crack monitor</span>
            <b className="big">Crack movement is above the limit</b>
            <span>Your technician has been notified.</span>
          </button>
        )}
        {openAlerts.length === 0 && !overLimit && (
          <div className="card alert ok"><b className="big">No active alerts</b><span>Leak sensors are dry.</span></div>
        )}
        <button className="btn primary" onClick={() => go('check')}>Check a wall crack</button>
        <section>
          <h2 className="h2">Leak sensors</h2>
          <div className="card list">
            {LEAK_SENSORS.map((s) => (
              <div key={s.id} className="li"><span>{s.name}</span>
                <b className={state.leaks[s.id] ? 'tx-bad' : 'tx-ok'}>{state.leaks[s.id] ? 'Water detected' : 'Dry'}</b></div>
            ))}
            {monitored && (
              <div className="li"><span>Crack monitor, {monitored.title.toLowerCase()}</span>
                <b className={overLimit ? 'tx-bad' : 'tx-ok'}>{lastMm != null ? lastMm.toFixed(2) + ' mm' : '—'}</b></div>
            )}
          </div>
        </section>
        <div className="grid2">
          <button className="card tile" onClick={() => go('reports')}><b>My reports</b><span>{mine.length} report{mine.length === 1 ? '' : 's'}</span></button>
          <button className="card tile" onClick={() => go('baseline')}><b>Handover inspection</b><span>Recorded {BASELINE.date}</span></button>
        </div>
      </div>
    );
  }
  return body;
}

function LeakAlert({ a, go, dispatch }) {
  const [note, setNote] = useState('');
  return (
    <div className="screen">
      <button className="back" onClick={() => go('home')}>Back</button>
      <div><div className="eyebrow tx-bad">Leak sensor alert · {fmtTime(a.at)}</div><h1 className="h1">Water detected: {sensorName(a.sensor)}</h1></div>
      <div className="card">
        <b>What to do now</b>
        <ul>{LEAK_GUIDANCE.doNow.map((t) => <li key={t}>{t}</li>)}</ul>
        <p className="muted small">{LEAK_GUIDANCE.limit}</p>
      </div>
      <div className="card"><span className="muted small">Repair cost</span><b>{LEAK_GUIDANCE.cost}</b><span className="muted small">A plumber confirms the cause and quotes the repair.</span></div>
      {a.reportId ? (
        <button className="btn ghost" onClick={() => go('report', { id: a.reportId })}>View report {a.reportId}</button>
      ) : (
        <>
          <label className="lbl" htmlFor="leak-note">Anything to add? (optional)</label>
          <textarea id="leak-note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="For example: dripping from the pipe joint" />
          <button className="btn primary" onClick={() => { dispatch({ type: 'submit', alertId: a.id, report: { type: 'leak', title: 'Leak: ' + sensorName(a.sensor).toLowerCase(), sensor: a.sensor, note, alertAt: a.at } }); go('reports'); }}>
            Send a repair request
          </button>
          <p className="muted small center">You decide whether to report. Nothing is sent until you tap the button.</p>
        </>
      )}
    </div>
  );
}

function verdict(top, sample) {
  if (sample) return { kind: 'sample', label: top.label };
  if (!top || top.conf < CONF_MIN) return { kind: 'none' };
  if (top.conf < CONF_SHOW) return { kind: 'unsure', label: top.label, conf: top.conf };
  return { kind: 'ok', label: top.label, conf: top.conf };
}

function CrackCheck({ go, dispatch }) {
  const [step, setStep] = useState('pick');
  const [photo, setPhoto] = useState(null);
  const [res, setRes] = useState(null);
  const [signs, setSigns] = useState([]);
  const [note, setNote] = useState('');
  const [where, setWhere] = useState('Side wall, near window');
  const ms = modelStatus().status;

  async function run(src, sample) {
    setStep('analysing');
    const img = await loadImage(src);
    const small = shrink(img);
    setPhoto(small);
    if (sample) {
      const b = sample.box, s = small.w / sample.w;
      setRes({ boxes: [{ x: b.x * s, y: b.y * s, w: b.w * s, h: b.h * s, label: sample.kind, conf: null }], v: verdict({ label: sample.kind }, true) });
    } else if (ms === 'ready') {
      try {
        const raw = await detect(img, CONF_MIN);
        const boxes = raw.map((b) => ({ ...b, x: b.x * small.scale, y: b.y * small.scale, w: b.w * small.scale, h: b.h * small.scale }));
        setRes({ boxes, v: verdict(boxes[0]) });
      } catch (e) { setRes({ boxes: [], v: { kind: 'error', msg: String(e.message || e) } }); }
    } else {
      setRes({ boxes: [], v: { kind: 'nomodel' } });
    }
    setStep('result');
  }
  function onFile(e) {
    const f = e.target.files && e.target.files[0]; if (!f) return;
    const rd = new FileReader(); rd.onload = () => run(rd.result, null); rd.readAsDataURL(f);
  }
  function submit() {
    const v = res.v;
    dispatch({ type: 'submit', report: {
      type: 'crack', title: (v.label ? v.label + ' crack' : 'Wall crack') + ', ' + where.toLowerCase(),
      where, note, signs, photo: photo.src, photoW: photo.w, photoH: photo.h, boxes: res.boxes,
      ai: v.label ? { label: v.label, conf: v.conf ?? null, source: v.kind === 'sample' ? 'sample' : 'model', unsure: v.kind === 'unsure' } : null,
    } });
    go('reports');
  }

  if (step === 'pick') return (
    <div className="screen">
      <button className="back" onClick={() => go('home')}>Back</button>
      <h1 className="h1">Check a wall crack</h1>
      <p className="muted">Hold the phone square to the wall, about an arm's length away, in good light.</p>
      <label className="btn primary filebtn">Take or upload a photo
        <input type="file" accept="image/*" capture="environment" onChange={onFile} />
      </label>
      <div className={'modelnote ' + (ms === 'ready' ? 'ok' : 'warn')}>
        {ms === 'ready' ? 'Trained crack model loaded. Results on your photos are real model output.'
          : ms === 'loading' ? 'Loading the crack model…'
          : 'The trained model is not loaded in this build, so your own photo cannot be analysed here. Use a sample illustration below to see the flow.'}
      </div>
      <h2 className="h2">Sample illustrations</h2>
      <div className="grid2">
        {CLASSES.map((k) => (
          <button key={k} className="card tile" onClick={() => { const s = makeSample(k); run(s.src, s); }}><b>{k}</b><span>Drawn example</span></button>
        ))}
      </div>
    </div>
  );
  if (step === 'analysing') return <div className="screen"><h1 className="h1">Checking the photo…</h1><div className="scan" /></div>;

  const v = res.v, g = v.label ? GUIDANCE[v.label] : null;
  return (
    <div className="screen">
      <button className="back" onClick={() => setStep('pick')}>Retake</button>
      <AiPhoto src={photo.src} boxes={v.kind === 'ok' || v.kind === 'unsure' || v.kind === 'sample' ? res.boxes.slice(0, 1) : []} natural={{ w: photo.w, h: photo.h }} />
      {v.kind === 'sample' && <div className="modelnote warn">Sample result on a drawn illustration. This is not output from the trained model.</div>}
      {v.kind === 'ok' && <div><div className="eyebrow">AI-detected pattern</div><h1 className="h1">{v.label} crack</h1><span className="muted">Model confidence {v.conf.toFixed(2)}</span></div>}
      {v.kind === 'sample' && <div><div className="eyebrow">Sample pattern</div><h1 className="h1">{v.label} crack</h1></div>}
      {v.kind === 'unsure' && <div className="card alert warn"><b className="big">Not sure</b><span>The model's best guess is {v.label.toLowerCase()} ({v.conf.toFixed(2)}), which is too low to rely on. Retake closer, square to the wall, in good light.</span></div>}
      {v.kind === 'none' && <div className="card alert warn"><b className="big">No crack pattern found</b><span>Retake the photo closer and in better light. You can still report it.</span></div>}
      {v.kind === 'nomodel' && <div className="card alert warn"><b className="big">AI check not available</b><span>The trained model is not loaded in this build. You can still describe the crack and report it.</span></div>}
      {v.kind === 'error' && <div className="card alert warn"><b className="big">The AI check failed</b><span>{v.msg}</span></div>}

      {g && (
        <div className="card">
          <b>What this pattern usually is</b><p>{g.what}</p>
          <b>Possible causes</b>
          <ul>{g.causes.map((c) => <li key={c}>{c}</li>)}</ul>
          <p className="muted small">A photo shows the pattern only. It cannot show the cause, the width, or whether the wall is safe.</p>
          <b>Suggested next step</b><p>{g.next}</p>
        </div>
      )}
      <div className="card">
        <b>Do any of these apply?</b>
        {WARNING_SIGNS.map((s) => (
          <label key={s} className="check"><input type="checkbox" checked={signs.includes(s)} onChange={() => setSigns(signs.includes(s) ? signs.filter((x) => x !== s) : [...signs, s])} />{s}</label>
        ))}
        {signs.length > 0 && <div className="modelnote bad">Please ask for a professional assessment soon, and do not wait for monitoring.</div>}
      </div>
      <div className="card">
        <b>Indicative costs</b>
        {Object.values(COSTS).map((c) => (
          <div key={c.label} className="cost"><span>{c.label}</span><b>{c.value}</b>{c.source && <span className="muted small">{c.source}</span>}</div>
        ))}
        <p className="muted small">The actual cost depends on what a professional confirms.</p>
      </div>
      <label className="lbl" htmlFor="crack-where">Where is it?</label>
      <input id="crack-where" value={where} onChange={(e) => setWhere(e.target.value)} />
      <label className="lbl" htmlFor="crack-note">Anything to add? (optional)</label>
      <textarea id="crack-note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="For example: noticed it last week after heavy rain" />
      <button className="btn primary" onClick={submit}>Submit to property management</button>
      <button className="btn ghost" onClick={() => go('home')}>Not now</button>
      <p className="muted small center">Nothing is sent unless you tap Submit.</p>
    </div>
  );
}

function ReportDetail({ r, go }) {
  const last = r.readings && r.readings.length ? r.readings[r.readings.length - 1].mm : null;
  return (
    <div className="screen">
      <button className="back" onClick={() => go('reports')}>My reports</button>
      <div><div className="eyebrow">{r.id}</div><h1 className="h1">{r.title}</h1><Pill status={r.status} /></div>
      {r.photo && <AiPhoto src={r.photo} boxes={(r.boxes || []).slice(0, 1)} natural={{ w: r.photoW, h: r.photoH }} />}
      {r.ai && <div className="card"><span className="muted small">AI-detected pattern{r.ai.source === 'sample' ? ' (sample)' : ''}</span><b>{r.ai.label}{r.ai.conf != null ? ' · confidence ' + r.ai.conf.toFixed(2) : ''}{r.ai.unsure ? ' · low confidence' : ''}</b></div>}
      {r.status === 'monitor' && (
        <div className="card">
          <b>Crack monitor</b>
          <MoveChart readings={r.readings} limit={r.limitMm} />
          <span className={last > r.limitMm ? 'tx-bad' : 'muted small'}>Latest {last != null ? last.toFixed(2) : '—'} mm · limit {r.limitMm} mm set by your technician</span>
        </div>
      )}
      {r.techNote && <div className="card"><span className="muted small">From your technician</span><span>{r.techNote}</span></div>}
      <div className="card"><b>Progress</b>
        <ol className="tl">{(r.timeline || []).map((t, i) => <li key={i}><span className="muted small">{fmtTime(t.at)}</span>{t.text}</li>)}</ol>
      </div>
    </div>
  );
}

function Baseline({ go }) {
  return (
    <div className="screen">
      <button className="back" onClick={() => go('home')}>Back</button>
      <div><div className="eyebrow">Recorded {BASELINE.date} · sample record</div><h1 className="h1">Handover inspection</h1></div>
      <p className="muted">Your home's condition when the keys were handed over. Later reports are compared with it.</p>
      <div className="card list">
        {BASELINE.items.map((it) => (
          <div key={it.area} className="li col"><b>{it.area} {!it.ok && <Tag tone="warn">Recorded defect</Tag>}</b><span className="muted small">{it.result}</span></div>
        ))}
      </div>
      <p className="muted small">Inspector: {BASELINE.inspector}</p>
    </div>
  );
}
