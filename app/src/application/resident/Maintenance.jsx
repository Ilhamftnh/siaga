import { useMemo, useState } from 'react';
import { useStore, lastReading } from '../../shared/services/store.jsx';
import { DEMO_HOME, CATEGORIES, ROOMS, FLOORS, OPEN_STATUSES, STATUS, STEPS, roomName, catName, techName } from '../../shared/data/seed.js';
import { fmtDateTime, fmtVisit, fmtDate } from '../../shared/services/format.js';
import { href, go } from '../../shared/services/router.js';
import Icon from '../shared/Icon.jsx';
import { StatusBadge, Segmented, Empty, Button, Field, Confirm, Dialog, Stepper, useToast } from '../shared/ui.jsx';
import { AiPhoto, MoveChart, BaselineCompare } from '../shared/visuals.jsx';
import CrackCheck from './CrackCheck.jsx';
import { nextStep } from './Home.jsx';
import { Page, BASE } from './Page.jsx';

export default function Maintenance({ rest }) {
  if (rest[0] === 'new') return <NewRequest category={rest[1]} deviceId={rest[2]} />;
  if (rest[0]) return <RequestDetail id={rest[0]} />;
  return <RequestList />;
}

function RequestList() {
  const { state } = useStore();
  const [tab, setTab] = useState('open');
  const mine = state.workOrders.filter((w) => w.home === DEMO_HOME);
  const open = mine.filter((w) => OPEN_STATUSES.includes(w.status));
  const past = mine.filter((w) => !OPEN_STATUSES.includes(w.status));
  const list = tab === 'open' ? open : past;
  return (
    <Page title="Maintenance">
      <div className="toolbar">
        <Segmented label="Requests" value={tab} onChange={setTab} options={[['open', 'Open', open.length], ['past', 'History', past.length]]} />
        <a className="btn btn-primary" href={href(BASE + '/maintenance/new')}><Icon name="plus" size={18} />New request</a>
      </div>
      {list.length ? (
        <ul className="rows panel">
          {list.map((w) => (
            <li key={w.id}><a className="row" href={href(BASE + '/maintenance/' + w.id)}>
              <span className="row-main">
                <span className="row-title">{w.title}</span>
                <span className="row-sub">{w.id}, sent {fmtDate(w.created)}</span>
                <span className="row-sub">{nextStep(w)}</span>
              </span>
              <span className="row-end"><StatusBadge status={w.status} /><Icon name="right" size={18} className="chev" /></span>
            </a></li>
          ))}
        </ul>
      ) : (
        <div className="panel"><Empty icon="wrench" title={tab === 'open' ? 'No open requests' : 'No past requests'}
          action={tab === 'open' && <a className="btn btn-sm" href={href(BASE + '/maintenance/new')}>Report an issue</a>}>
          {tab === 'open' ? 'When something in your home needs fixing, send a request and track it here.' : 'Completed and cancelled requests will appear here.'}
        </Empty></div>
      )}
    </Page>
  );
}

const PREF_TIMES = ['Weekday morning (9am–12pm)', 'Weekday afternoon (2pm–5pm)', 'Saturday morning', 'Any time'];

function NewRequest({ category: cat0, deviceId }) {
  const { state, dispatch } = useStore();
  const toast = useToast();
  const device = deviceId && state.devices[deviceId];
  const [category, setCategory] = useState(CATEGORIES.some((c) => c.id === cat0) ? cat0 : '');
  const [room, setRoom] = useState(device ? device.room : cat0 === 'crack' ? 'living' : '');
  const [summary, setSummary] = useState(device ? `Water ${device.spot.toLowerCase()}` : '');
  const [description, setDescription] = useState('');
  const [prefTime, setPrefTime] = useState(PREF_TIMES[0]);
  const [share, setShare] = useState(true);
  const [crack, setCrack] = useState({ photo: null, boxes: [], v: null, signs: [] });
  const [photo, setPhoto] = useState(null);
  const [errors, setErrors] = useState({});
  const [review, setReview] = useState(false);
  const relatedDevice = device || (category === 'leak' ? Object.values(state.devices).find((d) => d.kind === 'leak' && d.room === room) : null);

  const aiLabel = crack.v && crack.v.label && (crack.v.kind === 'ok' || crack.v.kind === 'sample') ? crack.v.label : null;
  const autoSummary = category === 'crack' ? `${aiLabel || 'Wall'} crack${room ? ', ' + roomName(room).toLowerCase() : ''}` : '';
  const title = (summary.trim() || autoSummary).trim();
  const priority = category === 'leak' ? 'high' : category === 'crack' && crack.signs.length ? 'high' : 'normal';

  function validate() {
    const e = {};
    if (!category) e.category = 'Choose what the problem is.';
    if (!room) e.room = 'Choose the room.';
    if (category !== 'crack' && title.length < 5) e.summary = 'Give the problem a short title, at least 5 characters.';
    if (description.trim().length < 10) e.description = 'Describe the problem in a sentence or two (at least 10 characters).';
    if (category === 'crack' && !crack.photo) e.photo = 'Add a photo so the technician can see the crack.';
    setErrors(e);
    if (Object.keys(e).length) {
      const first = document.querySelector('[data-err="' + Object.keys(e)[0] + '"]');
      if (first) first.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return false;
    }
    return true;
  }
  function send() {
    const v = crack.v;
    const p = category === 'crack' ? crack.photo : photo;
    dispatch({ type: 'wo/create', wo: {
      category, room, title, description: description.trim(), prefTime, priority,
      photo: p ? p.src : null, photoW: p ? p.w : null, photoH: p ? p.h : null,
      boxes: category === 'crack' ? crack.boxes.slice(0, 1) : [],
      ai: category === 'crack' && v && v.label ? { label: v.label, conf: v.conf ?? null, source: v.kind === 'sample' ? 'sample' : 'model', unsure: v.kind === 'unsure' } : null,
      signs: category === 'crack' ? crack.signs : [],
      deviceId: relatedDevice ? relatedDevice.id : category === 'crack' && room === 'living' ? 'crack-w3' : null,
      source: device ? 'leak_sensor' : 'resident', shareReadings: share,
      location: category === 'crack' && room === 'living' ? 'Side wall, window W3' : '',
    } });
    const id = 'WO-' + state.nextWo;
    toast(`Request ${id} sent to property management`);
    go(BASE + '/maintenance/' + id);
  }
  async function onOtherPhoto(e) {
    const f = e.target.files && e.target.files[0]; if (!f) return;
    const { shrink, loadImage } = await import('../../shared/data/samplePhotos.js');
    const rd = new FileReader();
    rd.onload = async () => { const img = await loadImage(rd.result); const s = shrink(img, 760); setPhoto({ src: s.src, w: s.w, h: s.h }); };
    rd.readAsDataURL(f);
  }

  return (
    <Page title="New request" back={['maintenance', 'Maintenance']}>
      <form className="form" noValidate onSubmit={(e) => { e.preventDefault(); if (validate()) setReview(true); }}>
        {device && (
          <div className="notice t-brand"><Icon name="drop" /><div><b>From a leak sensor alert</b>The leak sensor {device.spot.toLowerCase()} detected water. Its readings will be attached.</div></div>
        )}
        <fieldset className={'field' + (errors.category ? ' has-error' : '')} data-err="category">
          <legend className="field-label">What's the problem?</legend>
          <div className="panel">
            {CATEGORIES.map((c) => (
              <label key={c.id} className="choice">
                <input type="radio" name="cat" value={c.id} checked={category === c.id} onChange={() => { setCategory(c.id); if (c.id === 'crack' && !room) setRoom('living'); }} />
                <span><b>{c.name}</b><span>{c.hint}</span></span>
              </label>
            ))}
          </div>
          {errors.category && <p className="field-error" role="alert"><Icon name="alert" size={14} />{errors.category}</p>}
        </fieldset>

        {category && (
          <>
            <Field label="Room" htmlFor="room" error={errors.room}>
              <select id="room" className="select" value={room} onChange={(e) => setRoom(e.target.value)} data-err="room">
                <option value="">Choose a room</option>
                {FLOORS.map((f) => <optgroup key={f.id} label={f.name}>{ROOMS.filter((r) => r.floor === f.id).map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}</optgroup>)}
                <option value="outside">Outside the house</option>
              </select>
            </Field>

            {category === 'crack' && <div data-err="photo"><CrackCheck value={crack} onChange={setCrack} error={errors.photo} /></div>}

            <Field label="Short title" htmlFor="summary" error={errors.summary} optional={category === 'crack'}
              hint={category === 'crack' ? `Leave blank to use "${autoSummary}"` : 'For example: Kitchen tap drips when closed'}>
              <input id="summary" className="input" value={summary} maxLength={70} onChange={(e) => setSummary(e.target.value)} data-err="summary" />
            </Field>
            <Field label="Describe the problem" htmlFor="desc" error={errors.description} hint="When did you notice it? Is it getting worse?">
              <textarea id="desc" className="textarea" value={description} maxLength={600} onChange={(e) => setDescription(e.target.value)} data-err="description" />
            </Field>
            {category !== 'crack' && (
              <Field label="Photo" optional hint="A photo helps the technician bring the right parts.">
                {photo && <img className="thumb" src={photo.src} alt="Attached" />}
                <label className="btn btn-sm filebtn" style={{ alignSelf: 'flex-start' }}><Icon name="camera" size={16} />{photo ? 'Replace photo' : 'Add a photo'}
                  <input type="file" accept="image/*" capture="environment" className="sr" onChange={onOtherPhoto} /></label>
              </Field>
            )}
            <Field label="Best time for a visit" htmlFor="pt">
              <select id="pt" className="select" value={prefTime} onChange={(e) => setPrefTime(e.target.value)}>{PREF_TIMES.map((t) => <option key={t}>{t}</option>)}</select>
            </Field>
            {(relatedDevice || category === 'crack') && (
              <label className="choice panel">
                <input type="checkbox" checked={share} onChange={(e) => setShare(e.target.checked)} />
                <span><b>Share related sensor readings with the technician</b><span>Only readings from the sensor linked to this request. You can send the request without them.</span></span>
              </label>
            )}
            <div className="form-actions">
              <Button variant="primary" type="submit" className="btn-block">Review request</Button>
            </div>
          </>
        )}
      </form>

      <Dialog open={review} title="Send this request?" onClose={() => setReview(false)}
        actions={<><Button onClick={() => setReview(false)}>Edit</Button><Button variant="primary" onClick={send}>Send request</Button></>}>
        <dl className="kv">
          <dt>Problem</dt><dd>{catName(category)}</dd>
          <dt>Title</dt><dd>{title}</dd>
          <dt>Room</dt><dd>{room === 'outside' ? 'Outside the house' : roomName(room)}</dd>
          {category === 'crack' && <><dt>AI label</dt><dd>{aiLabel ? `${aiLabel}${crack.v.kind === 'sample' ? ' (sample)' : ''}` : 'None'}</dd></>}
          {crack.signs.length > 0 && category === 'crack' && <><dt>Warning signs</dt><dd>{crack.signs.length} ticked</dd></>}
          <dt>Visit time</dt><dd>{prefTime}</dd>
          <dt>Sensor readings</dt><dd>{(relatedDevice || category === 'crack') && share ? 'Shared' : 'Not shared'}</dd>
        </dl>
        <p className="small muted">It goes to the property management team, who assign a technician. You'll be notified at each step.</p>
      </Dialog>
    </Page>
  );
}

function RequestDetail({ id }) {
  const { state, dispatch } = useStore();
  const toast = useToast();
  const [cancel, setCancel] = useState(false);
  const w = state.workOrders.find((x) => x.id === id && x.home === DEMO_HOME);
  if (!w) return <Page title="Request" back={['maintenance', 'Maintenance']}><div className="panel"><Empty title="Request not found">It may have been removed when the demo data was reset.</Empty></div></Page>;
  const st = STATUS[w.status];
  const dev = w.deviceId && state.devices[w.deviceId];
  const canCancel = ['new', 'assigned', 'scheduled'].includes(w.status);
  return (
    <Page back={['maintenance', 'Maintenance']}>
      <div className="req-head">
        <div><p className="muted small">{w.id}, {catName(w.category)}</p><h1>{w.title}</h1></div>
        <StatusBadge status={w.status} />
      </div>
      <div className="panel panel-pad">
        <Stepper steps={STEPS} current={st.step < 0 ? 0 : st.step} stopped={st.step < 0} />
        <p className="step-note">{st.step < 0 ? `This request was ${STATUS[w.status].text.toLowerCase()}${w.completion ? ': ' + w.completion.summary : '.'}` : nextStep(w)}</p>
      </div>

      {w.completion && w.status === 'completed' && (
        <section className="notice t-ok"><Icon name="check" /><div><b>Work completed {fmtDateTime(w.completion.at)}</b>{w.completion.summary}</div></section>
      )}

      <section className="section">
        <h2>Details</h2>
        <dl className="kv panel panel-pad">
          <dt>Technician</dt><dd>{w.assignee ? techName(w.assignee) : 'Not assigned yet'}</dd>
          <dt>Visit</dt><dd>{w.appointment ? fmtVisit(w.appointment) : 'Not booked yet'}</dd>
          <dt>Room</dt><dd>{w.room === 'outside' ? 'Outside the house' : roomName(w.room)}</dd>
          <dt>Sent</dt><dd>{fmtDateTime(w.created)}</dd>
          {w.prefTime && <><dt>Preferred time</dt><dd>{w.prefTime}</dd></>}
          <dt>{w.source === 'crack_monitor' ? 'Raised by' : 'Your description'}</dt><dd>{w.source === 'crack_monitor' ? 'Crack monitor at window W3. ' : ''}{w.description}</dd>
          {w.signs.length > 0 && <><dt>Warning signs</dt><dd>{w.signs.join('; ')}</dd></>}
        </dl>
      </section>

      {w.photo && (
        <section className="section">
          <h2>Photo</h2>
          <AiPhoto src={w.photo} boxes={w.boxes} w={w.photoW} h={w.photoH} />
          {w.ai && <p className="small muted">AI label: {w.ai.label}{w.ai.conf != null ? `, confidence ${w.ai.conf.toFixed(2)}` : ''}{w.ai.source === 'sample' ? ' (sample illustration)' : ''}{w.ai.unsure ? ', low confidence' : ''}</p>}
        </section>
      )}

      {w.evidence && (
        <section className="section">
          <h2>Handover baseline and the reading that raised this</h2>
          <BaselineCompare evidence={w.evidence} confirmed={w.findings.some((f) => f.result === 'confirmed')} />
        </section>
      )}
      {w.findings.length > 0 && (
        <section className="section">
          <h2>Technician's findings</h2>
          <ul className="rows panel">{w.findings.map((f, i) => <li key={i} className="row"><span className="row-main"><span className="row-title">{f.area}</span><span className="row-sub">{f.note}</span></span></li>)}</ul>
        </section>
      )}

      {dev && dev.kind === 'crack' && dev.installed && dev.woId === w.id && (
        <section className="section">
          <div className="section-head"><h2>Crack monitor</h2><a href={href(BASE + '/devices/crack-w3')}>Device</a></div>
          <div className="panel panel-pad"><MoveChart readings={dev.readings} limit={dev.limit} height={130} /></div>
          <p className="small muted num">Latest {(lastReading(dev) ?? 0).toFixed(2)} mm, limit {dev.limit} mm.</p>
        </section>
      )}

      <section className="section">
        <h2>Updates</h2>
        <ol className="timeline panel">
          {[...w.timeline].reverse().map((t, i) => <li key={i}><span className="xs muted">{fmtDateTime(t.at)}</span><span>{t.text}</span></li>)}
        </ol>
      </section>

      {canCancel && <Button variant="ghost" className="danger-text" onClick={() => setCancel(true)}>Cancel request</Button>}
      <Confirm open={cancel} onClose={() => setCancel(false)} danger title="Cancel this request?" confirmLabel="Cancel request"
        body={`${w.id} will be closed${w.appointment ? ' and the booked visit released' : ''}. You can send a new request at any time.`}
        onConfirm={() => { dispatch({ type: 'wo/cancel', id: w.id }); toast(`${w.id} cancelled`, 'info'); }} />
    </Page>
  );
}
