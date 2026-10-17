import { useState } from 'react';
import { useStore, fmtTime } from '../store.jsx';
import { BASELINE, HOMES } from '../data/seed.js';
import { Pill, Tag, MoveChart, AiPhoto } from '../components/Bits.jsx';

const homeLabel = (id) => { const h = HOMES.find((x) => x.id === id); return h ? h.label + ', ' + h.street : id; };
const OPEN = ['submitted', 'inspect', 'urgent', 'repair', 'monitor'];

export default function Technician() {
  const { state } = useStore();
  const [sel, setSel] = useState(null);
  const r = sel && state.reports.find((x) => x.id === sel);
  if (r) return <Case r={r} back={() => setSel(null)} />;
  const open = state.reports.filter((x) => OPEN.includes(x.status));
  const done = state.reports.filter((x) => !OPEN.includes(x.status));
  return (
    <div className="screen">
      <div><div className="eyebrow">Technician console</div><h1 className="h1">Cases</h1></div>
      <h2 className="h2">Open ({open.length})</h2>
      {open.map((x) => <CaseRow key={x.id} x={x} onClick={() => setSel(x.id)} />)}
      <h2 className="h2">Closed</h2>
      {done.map((x) => <CaseRow key={x.id} x={x} onClick={() => setSel(x.id)} />)}
    </div>
  );
}

function CaseRow({ x, onClick }) {
  const last = x.readings && x.readings.length ? x.readings[x.readings.length - 1].mm : null;
  const over = x.status === 'monitor' && last != null && last > x.limitMm;
  return (
    <button className={'card row-card' + (x.status === 'submitted' || over ? ' hot' : '')} onClick={onClick}>
      <span className="eyebrow">{x.id} · {homeLabel(x.home)}{x.sample ? ' · sample' : ''}</span>
      <b>{x.title}</b>
      <span className="rowline"><Pill status={x.status} />{over && <Tag tone="bad">Above limit</Tag>}{x.signs && x.signs.length > 0 && <Tag tone="bad">Warning signs</Tag>}</span>
    </button>
  );
}

function Case({ r, back }) {
  const { dispatch } = useStore();
  const [limit, setLimit] = useState(0.5);
  const [note, setNote] = useState('');
  const [agree, setAgree] = useState(r.techAgree || '');
  const decide = (status, log, extra = {}) => dispatch({ type: 'decide', id: r.id, status, log, note: note || undefined, ...extra });
  const last = r.readings && r.readings.length ? r.readings[r.readings.length - 1].mm : null;
  const baselineHit = r.type === 'crack' && r.home === BASELINE.home && BASELINE.items.find((i) => !i.ok);

  return (
    <div className="screen">
      <button className="back" onClick={back}>All cases</button>
      <div><div className="eyebrow">{r.id} · {homeLabel(r.home)} · {fmtTime(r.created)}</div><h1 className="h1">{r.title}</h1><Pill status={r.status} /></div>
      {r.photo && <AiPhoto src={r.photo} boxes={(r.boxes || []).slice(0, 1)} natural={{ w: r.photoW, h: r.photoH }} />}
      <div className="card list">
        {r.ai && <div className="li col"><span className="muted small">AI reading of the photo{r.ai.source === 'sample' ? ' (sample)' : ''}</span><b>{r.ai.label}{r.ai.conf != null ? ' · ' + r.ai.conf.toFixed(2) : ''}{r.ai.unsure ? ' · low confidence' : ''}</b></div>}
        {r.type === 'crack' && !r.ai && <div className="li col"><span className="muted small">AI reading</span><b>None (model unavailable or no pattern found)</b></div>}
        {r.type === 'leak' && <div className="li col"><span className="muted small">Leak sensor</span><b>Water detected{r.alertAt ? ' at ' + fmtTime(r.alertAt) : ''}</b></div>}
        <div className="li col"><span className="muted small">Homeowner's note</span><span>{r.note || 'None'}</span></div>
        {r.signs && r.signs.length > 0 && <div className="li col"><span className="muted small tx-bad">Warning signs ticked by homeowner</span><span>{r.signs.join('; ')}</span></div>}
        {baselineHit && <div className="li col"><span className="muted small">Handover inspection, {BASELINE.date}</span><span>{baselineHit.area}: {baselineHit.result}</span></div>}
      </div>

      {r.type === 'crack' && r.ai && (
        <div className="card"><b>Does the AI label match what you see?</b>
          <div className="seg">{['Agree', 'Disagree', 'Not checked yet'].map((o) => (
            <button key={o} aria-pressed={agree === o} onClick={() => { setAgree(o); dispatch({ type: 'agree', id: r.id, value: o }); }}>{o}</button>))}</div>
          <span className="muted small">Saved with the case. In a pilot, these answers measure the model's real-world precision.</span>
        </div>
      )}

      {r.status === 'monitor' && (
        <div className="card"><b>Crack movement</b>
          <MoveChart readings={r.readings} limit={r.limitMm} />
          <span className={last > r.limitMm ? 'tx-bad' : 'muted small'}>{last != null ? 'Latest ' + last.toFixed(2) + ' mm' : 'No readings yet'} · limit {r.limitMm} mm{last > r.limitMm ? ' · limit exceeded, reassess' : ''}</span>
          <span className="muted small">Prototype input: the crack slider beside the 3D house. A real pilot uses a calibrated crackmeter.</span>
        </div>
      )}

      {r.status !== 'closed' && r.status !== 'declined' && r.status !== 'no_action' && (
        <div className="card">
          <b>{r.status === 'submitted' ? 'Your decision' : 'Update'}</b>
          <label className="lbl" htmlFor="tech-note">Note to homeowner (optional)</label>
          <textarea id="tech-note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="For example: I'll inspect on Tuesday morning" />
          {r.type === 'crack' ? (
            <div className="actions">
              <button className="btn danger" onClick={() => decide('urgent', 'Marked for urgent professional assessment')}>Urgent assessment</button>
              <button className="btn primary" onClick={() => decide('inspect', 'Inspection booked')}>Book inspection</button>
              <div className="inline">
                <label className="lbl" htmlFor="limit">Alert limit (mm of movement)</label>
                <input id="limit" type="number" min="0.05" step="0.05" value={limit} onChange={(e) => setLimit(Number(e.target.value))} />
                <button className="btn" onClick={() => decide('monitor', 'Crack monitor fitted, alert limit ' + limit + ' mm', { limitMm: limit })}>Fit crack monitor</button>
              </div>
              <button className="btn" onClick={() => decide('repair', 'Repair scheduled')}>Schedule repair</button>
              <button className="btn ghost" onClick={() => decide('no_action', 'Reviewed: no action needed')}>No action needed</button>
              <button className="btn ghost" onClick={() => decide('declined', 'Declined as duplicate or invalid')}>Decline (duplicate or invalid)</button>
            </div>
          ) : (
            <div className="actions">
              <button className="btn primary" onClick={() => decide('repair', 'Plumber visit scheduled')}>Schedule plumber visit</button>
              <button className="btn ghost" onClick={() => decide('no_action', 'Reviewed: no action needed')}>No action needed</button>
              <button className="btn ghost" onClick={() => decide('declined', 'Declined as duplicate or invalid')}>Decline (duplicate or invalid)</button>
            </div>
          )}
          {r.status !== 'submitted' && (
            <button className="btn primary" onClick={() => dispatch({ type: 'close', id: r.id, note: note || 'Repair completed and checked' })}>Mark repair completed</button>
          )}
          <span className="muted small">A qualified professional makes every safety and repair decision. The AI label is a starting point only.</span>
        </div>
      )}
      <div className="card"><b>History</b>
        <ol className="tl">{(r.timeline || []).map((t, i) => <li key={i}><span className="muted small">{fmtTime(t.at)}</span>{t.text}</li>)}</ol>
      </div>
    </div>
  );
}
