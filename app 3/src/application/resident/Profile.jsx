import { useState } from 'react';
import { useStore } from '../../shared/services/store.jsx';
import { RESIDENT } from '../../shared/data/seed.js';
import { fmtDate } from '../../shared/services/format.js';
import { href } from '../../shared/services/router.js';
import Icon from '../shared/Icon.jsx';
import { Switch, Button, Confirm, Badge, useToast } from '../shared/ui.jsx';
import { Page, BASE } from './Page.jsx';

const RESULT = { ok: ['ok', 'No defect'], potential: ['warn', 'Recorded'], confirmed: ['bad', 'Defect'] };

export function InspectionItems({ items }) {
  return (
    <ul className="rows panel">
      {items.map((it, i) => (
        <li key={i} className="row">
          <span className="row-main"><span className="row-title">{it.area}</span><span className="row-sub">{it.note}</span></span>
          <Badge tone={RESULT[it.result][0]} icon={null}>{RESULT[it.result][1]}</Badge>
        </li>
      ))}
    </ul>
  );
}

export default function Profile({ rest }) {
  const { state, dispatch } = useStore();
  const toast = useToast();
  const [reset, setReset] = useState(false);
  if (rest[0] === 'inspection') {
    const rec = state.inspections.find((i) => i.home === RESIDENT.home && i.type === 'handover');
    if (!rec) return <Page title="Handover inspection" back={['profile', 'Profile']}><div className="panel panel-pad small">Your home has not had its pre-handover inspection yet. The record appears here once the inspector completes it.</div></Page>;
    return (
      <Page title="Handover inspection" back={['profile', 'Profile']}>
        <dl className="kv panel panel-pad">
          <dt>Inspected</dt><dd>{fmtDate(rec.at)}</dd>
          <dt>Inspector</dt><dd>{rec.by}</dd>
          <dt>Record</dt><dd>{rec.id}</dd>
        </dl>
        <InspectionItems items={rec.items} />
        <p className="small muted">This record is the starting point for your home. If a recorded item changes, technicians compare it with this inspection. It records what was seen and measured; it is not a safety certificate. Sample record for the demo.</p>
      </Page>
    );
  }
  const P = state.prefs;
  const pref = (k, label, sub) => (
    <li className="row">
      <span className="row-main"><span className="row-title" id={'p-' + k}>{label}</span><span className="row-sub">{sub}</span></span>
      <Switch checked={P[k]} label={label} onChange={(v) => dispatch({ type: 'prefs', prefs: { [k]: v } })} />
    </li>
  );
  return (
    <Page title="Profile">
      <section className="profile-head">
        <span className="avatar lg">FH</span>
        <div><h2>{RESIDENT.name}</h2><p className="small muted">{RESIDENT.phone}</p></div>
      </section>

      <section className="section">
        <h2>Home</h2>
        <dl className="kv panel panel-pad">
          <dt>Address</dt><dd>No. 12, Jalan Siaga 3, {RESIDENT.township}</dd>
          <dt>Type</dt><dd>{RESIDENT.type}</dd>
          <dt>Keys handed over</dt><dd>{state.handover ? fmtDate(state.handover.at) : 'Not yet'}</dd>
        </dl>
        <ul className="rows panel"><li><a className="row" href={href(BASE + '/profile/inspection')}>
          <Icon name="clipboard" className="muted" />
          <span className="row-main"><span className="row-title">Handover inspection</span><span className="row-sub">{(() => { const r = state.inspections.find((i) => i.home === RESIDENT.home && i.type === 'handover'); return r ? `${fmtDate(r.at)}, ${r.id}` : 'Not inspected yet'; })()}</span></span>
          <Icon name="right" size={18} className="chev" />
        </a></li></ul>
      </section>

      <section className="section">
        <h2>Notifications</h2>
        <ul className="rows panel">
          {pref('leakAlerts', 'Leak alerts', 'When a leak sensor detects water')}
          {pref('device', 'Device status', 'Offline devices and crack monitor limits')}
          {pref('maintenance', 'Maintenance updates', 'Technician assigned, visits booked, work completed')}
        </ul>
      </section>

      <section className="section">
        <h2>Your data</h2>
        <div className="panel panel-pad small">
          Sensor readings stay with your home account. A technician sees them only for a request you send with readings shared. Nothing is sent to property management until you send a request.
        </div>
      </section>

      <section className="section">
        <h2>About this prototype</h2>
        <div className="panel panel-pad small">
          <p>SIAGA is a student prototype for the Sime Darby Property University Hackathon 2026. It is not affiliated with or endorsed by Sime Darby Property. The resident, home, technicians and other homes are sample data. Sensors are simulated in the <a href={href('house')}>house prototype</a>; the crack AI runs the team's trained model on your device.</p>
          <div className="btnrow" style={{ marginTop: 12 }}>
            <Button size="sm" onClick={() => setReset(true)}>Reset demo data</Button>
          </div>
        </div>
      </section>
      <Confirm open={reset} onClose={() => setReset(false)} danger title="Reset the demo?" confirmLabel="Reset demo data"
        body="All requests, notifications and sensor states go back to the starting sample data, in every open tab."
        onConfirm={() => { dispatch({ type: 'reset' }); toast('Demo data reset', 'info'); }} />
    </Page>
  );
}
