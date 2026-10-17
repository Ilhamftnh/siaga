import { useState } from 'react';
import { useStore, deviceState, lastReading } from '../../shared/services/store.jsx';
import { ME, TECHNICIANS, DEMO_HOME, RESIDENT, PRIORITY, STATUS, catName, techName, roomName, homeAddress } from '../../shared/data/seed.js';
import { fmtDateTime, fmtVisit, fmtDate, toLocalInput, duration, ago } from '../../shared/services/format.js';
import { href } from '../../shared/services/router.js';
import Icon from '../shared/Icon.jsx';
import { StatusBadge, PriorityBadge, Badge, Button, Field, Dialog, Confirm, Stepper, Empty, useToast, useNow } from '../shared/ui.jsx';
import { AiPhoto, MoveChart } from '../shared/visuals.jsx';
import { TPage, TBASE, isOverdue } from './common.jsx';

const FLOW = ['New', 'Assigned', 'Scheduled', 'In progress', 'Completed'];
const NOTE_KIND = { inspection: 'Inspection note', action: 'Action taken', note: 'Note' };
const FOLLOW = [['parts', 'Waiting for parts'], ['specialist', 'Needs a specialist or engineer'], ['monitoring', 'Monitoring over time'], ['access', 'Need another visit (access or weather)']];
const DECLINE = ['Duplicate of another request', 'Not a defect: normal wear or owner renovation', 'Outside the scope of property maintenance'];
const RESULT = { ok: ['ok', 'No fault'], potential: ['warn', 'Potential issue'], confirmed: ['bad', 'Confirmed fault'] };

export default function WorkOrder({ id }) {
  const { state, dispatch } = useStore();
  const toast = useToast();
  const now = useNow(30000);
  const [dlg, setDlg] = useState(null);
  const w = state.workOrders.find((x) => x.id === id);
  if (!w) return <TPage title="Work order" back={['work-orders', 'Work orders']}><div className="panel"><Empty title={`${id} not found`}>It may have been removed when the demo data was reset.</Empty></div></TPage>;

  const st = STATUS[w.status];
  const mine = w.assignee === ME;
  const closed = ['completed', 'declined', 'cancelled'].includes(w.status);
  const isDemoHome = w.home === DEMO_HOME;
  const crackDev = state.devices['crack-w3'];
  const monitorHere = crackDev.installed && crackDev.woId === w.id;
  const canFit = w.category === 'crack' && isDemoHome && !crackDev.installed;
  const close = () => setDlg(null);
  const act = (a, msg) => { dispatch({ ...a, id: w.id }); if (msg) toast(msg); };

  // Next-step panel: only the actions that make sense for the current status
  let next = null;
  if (closed) next = null;
  else if (!mine && w.status !== 'new') {
    next = (<><p className="small">Assigned to {techName(w.assignee)}.</p><div className="btnrow"><Button onClick={() => act({ type: 'wo/assign', tech: ME }, `${w.id} reassigned to you`)}>Take over this job</Button></div></>);
  } else if (w.status === 'new') {
    next = (<><p className="small">Assign this request before booking a visit.</p>
      <div className="btnrow">
        <Button variant="primary" onClick={() => act({ type: 'wo/assign', tech: ME }, `${w.id} assigned to you`)}>Assign to me</Button>
        <Button onClick={() => setDlg('assign')}>Assign to someone else</Button>
        <Button variant="ghost" onClick={() => setDlg('decline')}>Decline</Button>
      </div></>);
  } else if (w.status === 'assigned') {
    next = (<><p className="small">Book a visit with the resident{w.prefTime ? `. They prefer: ${w.prefTime.toLowerCase()}` : ''}.</p>
      <div className="btnrow"><Button variant="primary" icon="calendar" onClick={() => setDlg('schedule')}>Schedule visit</Button><Button variant="ghost" onClick={() => setDlg('decline')}>Decline</Button></div></>);
  } else if (w.status === 'scheduled') {
    next = (<><p className="small">Visit {fmtVisit(w.appointment)}{isOverdue(w, now) ? <b className="t-overdue">, overdue</b> : ''}.</p>
      <div className="btnrow"><Button variant="primary" icon="play" onClick={() => act({ type: 'wo/start' }, 'Job started')}>Start job</Button><Button onClick={() => setDlg('schedule')}>Reschedule</Button></div></>);
  } else if (w.status === 'in_progress') {
    next = (<><p className="small">Record what you find and do, then complete the job or flag a follow-up.</p>
      <div className="btnrow">
        <Button variant="primary" icon="check" onClick={() => setDlg('complete')}>Complete job</Button>
        <Button onClick={() => setDlg('follow')}>Needs follow-up</Button>
        {canFit && <Button icon="crack" onClick={() => setDlg('monitor')}>Fit crack monitor</Button>}
        {isDemoHome && <a className="btn" href={href(`${TBASE}/inspections/new/${w.id}`)}><Icon name="clipboard" size={18} />Inspect devices</a>}
      </div></>);
  } else if (w.status === 'follow_up') {
    next = (<><p className="small"><b>Follow-up:</b> {w.followUp ? w.followUp.text : ''}</p>
      <div className="btnrow"><Button variant="primary" onClick={() => act({ type: 'wo/start' }, 'Work resumed')}>Resume work</Button><Button icon="check" onClick={() => setDlg('complete')}>Complete job</Button></div></>);
  }

  const dev = Object.values(state.devices);
  const showDevices = isDemoHome && (w.shareReadings || w.source === 'leak_sensor');

  return (
    <TPage back={['work-orders', 'Work orders']}>
      <div className="wo-head">
        <div>
          <p className="small muted"><span className="wid">{w.id}</span>{catName(w.category)}, {w.source === 'leak_sensor' ? 'from a leak sensor alert' : 'sent by resident'} {ago(w.created, now)}</p>
          <h1>{w.title}</h1>
        </div>
        <div className="wo-badges"><StatusBadge status={w.status} />{w.status === 'follow_up' && w.followUp && <Badge tone="warn" icon={null}>{FOLLOW.find((f) => f[0] === w.followUp.reason)?.[1]}</Badge>}</div>
      </div>

      <div className="wo-grid">
        <div className="wo-main">
          <div className="panel panel-pad">
            <Stepper steps={FLOW} current={st.step < 0 ? 0 : st.step} stopped={st.step < 0} />
          </div>

          {next && <section className="panel nextstep" aria-label="Next step"><h2>Next step</h2>{next}</section>}

          {closed && w.completion && (
            <section className={'notice ' + (w.status === 'completed' ? 't-ok' : 't-off')}>
              <Icon name={w.status === 'completed' ? 'check' : 'x'} />
              <div><b>{w.status === 'completed' ? 'Completion summary' : STATUS[w.status].text}, {fmtDateTime(w.completion.at)}{w.completion.by ? ` by ${techName(w.completion.by)}` : ''}</b>{w.completion.summary}</div>
            </section>
          )}
          {w.status === 'cancelled' && <section className="notice t-off"><Icon name="x" /><div><b>Cancelled by the resident</b>No visit needed.</div></section>}

          <section className="section">
            <h2>Resident's report</h2>
            <div className="panel panel-pad report">
              <p>{w.description}</p>
              <dl className="kv small">
                <dt>Room</dt><dd>{w.room === 'outside' ? 'Outside the house' : roomName(w.room)}{w.location ? `, ${w.location}` : ''}</dd>
                {w.prefTime && <><dt>Preferred visit</dt><dd>{w.prefTime}</dd></>}
                {w.signs.length > 0 && <><dt>Warning signs</dt><dd className="t-bad-text">{w.signs.join('; ')}</dd></>}
              </dl>
              {w.photo && (
                <div className="wo-photo">
                  <AiPhoto src={w.photo} boxes={w.boxes} w={w.photoW} h={w.photoH} />
                </div>
              )}
              {w.ai && (
                <div className="aicheck">
                  <p className="small"><b>AI label: {w.ai.label}</b>{w.ai.conf != null ? `, confidence ${w.ai.conf.toFixed(2)}` : ''}{w.ai.source === 'sample' ? ' (sample)' : ''}{w.ai.unsure ? ', low confidence' : ''}. Pattern only; it does not assess cause, width or safety.</p>
                  {!closed || w.aiAgree ? (
                    <div className="seg-inline" role="group" aria-label="Does the AI label match what you see on site?">
                      <span className="small">Matches what you see on site?</span>
                      {['Agree', 'Disagree'].map((o) => (
                        <button key={o} type="button" aria-pressed={w.aiAgree === o} disabled={closed}
                          onClick={() => act({ type: 'wo/aiAgree', value: o }, 'Feedback saved')}>{o}</button>
                      ))}
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          </section>

          {monitorHere && (
            <section className="section">
              <div className="section-head"><h2>Crack monitor at window W3</h2>{crackDev.over && <Badge tone="bad">Above limit</Badge>}</div>
              <div className="panel panel-pad">
                <MoveChart readings={crackDev.readings} limit={crackDev.limit} />
                <p className="small muted num">Latest {(lastReading(crackDev) ?? 0).toFixed(2)} mm, {crackDev.readings.length} readings since {fmtDateTime(crackDev.installedAt || crackDev.readings[0]?.at)}. Prototype sensor: slide potentiometer, not a calibrated crackmeter.</p>
              </div>
            </section>
          )}

          <section className="section">
            <div className="section-head"><h2>Work log</h2><span className="small muted">{w.notes.length}</span></div>
            {w.notes.length > 0 && (
              <ul className="rows panel worklog">
                {w.notes.map((n, i) => (
                  <li key={i} className="row"><span className="row-main"><span className="row-sub">{NOTE_KIND[n.kind]}, {techName(n.by)}, {fmtDateTime(n.at)}</span><span>{n.text}</span></span></li>
                ))}
              </ul>
            )}
            {w.findings.length > 0 && (
              <ul className="rows panel">
                {w.findings.map((f, i) => (
                  <li key={i} className="row"><span className="row-main"><span className="row-title">{f.area}</span><span className="row-sub">{f.note || 'No note'}</span></span><Badge tone={RESULT[f.result][0]} icon={null}>{RESULT[f.result][1]}</Badge></li>
                ))}
              </ul>
            )}
            {!closed && mine && ['scheduled', 'in_progress', 'follow_up'].includes(w.status) ? <NoteForm w={w} /> : (!w.notes.length && !w.findings.length && <p className="small muted">Notes can be added once the job is scheduled.</p>)}
          </section>
        </div>

        <aside className="wo-side">
          <section className="panel">
            <div className="panel-head"><h2>Property</h2></div>
            <dl className="kv small panel-pad">
              <dt>Address</dt><dd>{homeAddress(w.home)}</dd>
              <dt>Resident</dt><dd>{isDemoHome ? <>{RESIDENT.name}<br /><a href={'tel:' + RESIDENT.phone.replace(/\s|-/g, '')}>{RESIDENT.phone}</a></> : 'Sample resident'}</dd>
              {isDemoHome && <><dt>Handover</dt><dd>{fmtDate(Date.parse(RESIDENT.handover))}, <a href={href(TBASE + '/inspections/INS-0201')}>inspection record</a></dd></>}
            </dl>
          </section>

          <section className="panel">
            <div className="panel-head"><h2>Assignment</h2>{!closed && w.status !== 'new' && <Button size="sm" variant="ghost" onClick={() => setDlg('assign')}>Change</Button>}</div>
            <dl className="kv small panel-pad">
              <dt>Technician</dt><dd>{w.assignee ? techName(w.assignee) : 'Unassigned'}</dd>
              <dt>Visit</dt><dd>{w.appointment ? fmtVisit(w.appointment) : 'Not booked'}</dd>
              <dt>Priority</dt><dd>
                {closed ? <PriorityBadge p={w.priority} /> : (
                  <select className="select sm" aria-label="Priority" value={w.priority} onChange={(e) => act({ type: 'wo/priority', priority: e.target.value }, 'Priority updated')}>
                    {Object.entries(PRIORITY).map(([k, p]) => <option key={k} value={k}>{p.text}</option>)}
                  </select>
                )}
              </dd>
              {w.firstResponse && <><dt>First response</dt><dd>{duration(w.firstResponse - w.created)} after sending</dd></>}
            </dl>
          </section>

          <section className="panel">
            <div className="panel-head"><h2>Devices at this home</h2>{isDemoHome && !closed && <a className="small" href={href(`${TBASE}/inspections/new/${w.id}`)}>Inspect</a>}</div>
            {!isDemoHome ? <p className="small muted panel-pad">No SIAGA devices registered at this home in the demo.</p>
              : !showDevices ? <p className="small muted panel-pad">The resident did not share sensor readings with this request. Ask them on site, or inspect the devices during the visit.</p>
              : (
                <ul className="rows">
                  {dev.map((d) => {
                    const s = deviceState(d, state.devices.hub.online);
                    const last = state.events.find((e) => e.deviceId === d.id);
                    return (
                      <li key={d.id} className={'row devmini' + (d.id === w.deviceId ? ' related' : '')}>
                        <span className="row-main"><span className="row-title small">{d.spot}</span><span className="row-sub">{last ? `${last.text}, ${ago(last.at, now)}` : 'No events'}</span></span>
                        <Badge tone={s.tone}>{s.text}</Badge>
                      </li>
                    );
                  })}
                </ul>
              )}
          </section>

          <section className="panel">
            <div className="panel-head"><h2>Timeline</h2></div>
            <ol className="ttl">
              {[...w.timeline].reverse().map((t, i) => <li key={i}><span className="xs muted">{fmtDateTime(t.at)}</span>{t.text}</li>)}
            </ol>
          </section>
        </aside>
      </div>

      <AssignDialog open={dlg === 'assign'} w={w} onClose={close} />
      <ScheduleDialog open={dlg === 'schedule'} w={w} onClose={close} />
      <FollowDialog open={dlg === 'follow'} w={w} onClose={close} />
      <MonitorDialog open={dlg === 'monitor'} w={w} onClose={close} />
      <CompleteDialog open={dlg === 'complete'} w={w} onClose={close} monitorHere={monitorHere} />
      <DeclineDialog open={dlg === 'decline'} w={w} onClose={close} />
    </TPage>
  );
}

function NoteForm({ w }) {
  const { dispatch } = useStore();
  const toast = useToast();
  const [kind, setKind] = useState('inspection');
  const [text, setText] = useState('');
  const [err, setErr] = useState('');
  return (
    <form className="panel panel-pad noteform" noValidate onSubmit={(e) => {
      e.preventDefault();
      if (text.trim().length < 5) { setErr('Write at least a few words.'); return; }
      dispatch({ type: 'wo/note', id: w.id, by: ME, kind, text: text.trim() }); setText(''); setErr(''); toast(NOTE_KIND[kind] + ' added');
    }}>
      <Field label="Add to the work log" htmlFor="nt" error={err}>
        <textarea id="nt" className="textarea" rows={3} value={text} onChange={(e) => setText(e.target.value)}
          placeholder={kind === 'action' ? 'For example: Replaced basin waste seal, tested for 10 minutes' : 'For example: Crack about 0.3 mm at the widest point, no damp'} />
      </Field>
      <div className="btnrow">
        <label className="sr" htmlFor="nk">Type of entry</label>
        <select id="nk" className="select sm" value={kind} onChange={(e) => setKind(e.target.value)}>
          <option value="inspection">Inspection note</option><option value="action">Action taken</option><option value="note">Note</option>
        </select>
        <Button type="submit" size="sm" variant="primary">Add entry</Button>
      </div>
    </form>
  );
}

function AssignDialog({ open, w, onClose }) {
  const { dispatch } = useStore();
  const toast = useToast();
  const [tech, setTech] = useState(w.assignee || ME);
  return (
    <Dialog open={open} title={`Assign ${w.id}`} onClose={onClose}
      actions={<><Button onClick={onClose}>Go back</Button><Button variant="primary" onClick={() => { dispatch({ type: 'wo/assign', id: w.id, tech }); toast(`${w.id} assigned to ${techName(tech)}`); onClose(); }}>Assign</Button></>}>
      <fieldset className="field"><legend className="field-label">Technician</legend>
        <div className="panel">{TECHNICIANS.map((t) => (
          <label key={t.id} className="choice"><input type="radio" name="tech" checked={tech === t.id} onChange={() => setTech(t.id)} /><b>{t.name}{t.id === ME ? ' (you)' : ''}</b></label>
        ))}</div>
      </fieldset>
    </Dialog>
  );
}

function ScheduleDialog({ open, w, onClose }) {
  const { dispatch } = useStore();
  const toast = useToast();
  const def = (() => { const d = new Date(Date.now() + 86400000); d.setHours(10, 0, 0, 0); return d.getTime(); })();
  const [val, setVal] = useState(toLocalInput(w.appointment && w.appointment > Date.now() ? w.appointment : def));
  const [err, setErr] = useState('');
  function save() {
    const t = new Date(val).getTime();
    if (!val || Number.isNaN(t)) return setErr('Choose a date and time.');
    if (t < Date.now()) return setErr('Choose a time in the future.');
    const h = new Date(t).getHours();
    if (h < 8 || h >= 19) return setErr('Visits are booked between 8am and 7pm.');
    dispatch({ type: 'wo/schedule', id: w.id, at: t });
    toast(w.appointment ? 'Visit rescheduled. The resident has been told.' : 'Visit scheduled. The resident has been told.');
    onClose();
  }
  return (
    <Dialog open={open} title={w.appointment ? 'Reschedule visit' : 'Schedule visit'} onClose={onClose}
      actions={<><Button onClick={onClose}>Go back</Button><Button variant="primary" onClick={save}>{w.appointment ? 'Reschedule' : 'Schedule visit'}</Button></>}>
      <p className="small">{homeAddress(w.home)}{w.prefTime ? `. Resident prefers ${w.prefTime.toLowerCase()}.` : ''}</p>
      <Field label="Date and time" htmlFor="appt" error={err} hint="Between 8am and 7pm">
        <input id="appt" type="datetime-local" className="input" value={val} onChange={(e) => { setVal(e.target.value); setErr(''); }} />
      </Field>
    </Dialog>
  );
}

function FollowDialog({ open, w, onClose }) {
  const { dispatch } = useStore();
  const toast = useToast();
  const [reason, setReason] = useState('parts');
  const [text, setText] = useState('');
  const [err, setErr] = useState('');
  return (
    <Dialog open={open} title="Needs follow-up" onClose={onClose}
      actions={<><Button onClick={onClose}>Go back</Button><Button variant="primary" onClick={() => {
        if (text.trim().length < 8) return setErr('Say what is needed, so the resident and the next technician know.');
        dispatch({ type: 'wo/followUp', id: w.id, reason, text: text.trim() }); toast('Marked for follow-up. The resident has been told.'); onClose();
      }}>Save follow-up</Button></>}>
      <fieldset className="field"><legend className="field-label">Reason</legend>
        <div className="panel">{FOLLOW.filter((f) => f[0] !== 'monitoring').map(([k, t]) => (
          <label key={k} className="choice"><input type="radio" name="fr" checked={reason === k} onChange={() => setReason(k)} /><b>{t}</b></label>
        ))}</div>
      </fieldset>
      <Field label="What happens next" htmlFor="fu" error={err} hint="Shown to the resident">
        <textarea id="fu" className="textarea" value={text} onChange={(e) => { setText(e.target.value); setErr(''); }} placeholder="For example: Replacement hinge ordered, back on Thursday" />
      </Field>
    </Dialog>
  );
}

function MonitorDialog({ open, w, onClose }) {
  const { dispatch } = useStore();
  const toast = useToast();
  const [limit, setLimit] = useState('0.5');
  const [err, setErr] = useState('');
  return (
    <Dialog open={open} title="Fit crack monitor" onClose={onClose}
      actions={<><Button onClick={onClose}>Go back</Button><Button variant="primary" onClick={() => {
        const v = Number(limit);
        if (!(v >= 0.1 && v <= 5)) return setErr('Enter a limit between 0.1 and 5 mm.');
        dispatch({ type: 'wo/fitMonitor', id: w.id, limit: v }); toast('Crack monitor fitted. The job moves to follow-up: monitoring.'); onClose();
      }}>Fit monitor</Button></>}>
      <p className="small">The monitor at window W3 records movement every few seconds in this prototype. When movement passes your limit, you and the resident are alerted and the job is raised to high priority.</p>
      <Field label="Alert limit (mm of movement)" htmlFor="lim" error={err} hint="Set from your on-site judgement. 0.1 to 5 mm.">
        <input id="lim" className="input" type="number" min="0.1" max="5" step="0.05" inputMode="decimal" value={limit} onChange={(e) => { setLimit(e.target.value); setErr(''); }} />
      </Field>
    </Dialog>
  );
}

function CompleteDialog({ open, w, onClose, monitorHere }) {
  const { dispatch } = useStore();
  const toast = useToast();
  const [summary, setSummary] = useState('');
  const [remove, setRemove] = useState(true);
  const [err, setErr] = useState('');
  const [confirm, setConfirm] = useState(false);
  return (
    <>
      <Dialog open={open && !confirm} title={`Complete ${w.id}`} onClose={onClose}
        actions={<><Button onClick={onClose}>Go back</Button><Button variant="primary" onClick={() => {
          if (summary.trim().length < 15) return setErr('Describe what was found and done (at least 15 characters). The resident sees this.');
          setConfirm(true);
        }}>Continue</Button></>}>
        <Field label="Completion summary" htmlFor="cs" error={err} hint="What you found, what you did, and any advice for the resident">
          <textarea id="cs" className="textarea" rows={4} value={summary} onChange={(e) => { setSummary(e.target.value); setErr(''); }} />
        </Field>
        {monitorHere && (
          <label className="choice panel"><input type="checkbox" checked={remove} onChange={(e) => setRemove(e.target.checked)} /><span><b>Remove the crack monitor</b><span>Untick to leave it recording after the job closes.</span></span></label>
        )}
      </Dialog>
      <Confirm open={open && confirm} onClose={() => setConfirm(false)} title="Mark the job as completed?" confirmLabel="Complete job"
        body="The resident is notified with your summary. The job moves to history and can't be edited."
        onConfirm={() => { dispatch({ type: 'wo/complete', id: w.id, summary: summary.trim(), removeMonitor: monitorHere && remove }); toast(`${w.id} completed`); setConfirm(false); onClose(); }} />
    </>
  );
}

function DeclineDialog({ open, w, onClose }) {
  const { dispatch } = useStore();
  const toast = useToast();
  const [reason, setReason] = useState('');
  const [err, setErr] = useState('');
  return (
    <Dialog open={open} title={`Decline ${w.id}?`} onClose={onClose}
      actions={<><Button onClick={onClose}>Go back</Button><Button variant="danger" onClick={() => {
        if (!reason) return setErr('Choose a reason. The resident sees it.');
        dispatch({ type: 'wo/decline', id: w.id, by: ME, reason }); toast(`${w.id} declined`, 'info'); onClose();
      }}>Decline request</Button></>}>
      <fieldset className={'field' + (err ? ' has-error' : '')}><legend className="field-label">Reason</legend>
        <div className="panel">{DECLINE.map((r) => (
          <label key={r} className="choice"><input type="radio" name="dr" checked={reason === r} onChange={() => { setReason(r); setErr(''); }} /><b>{r}</b></label>
        ))}</div>
        {err && <p className="field-error" role="alert"><Icon name="alert" size={14} />{err}</p>}
      </fieldset>
    </Dialog>
  );
}
