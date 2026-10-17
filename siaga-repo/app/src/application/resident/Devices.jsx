import { useState } from 'react';
import { useStore, deviceState, lastReading } from '../../shared/services/store.jsx';
import { ROOMS, roomName } from '../../shared/data/seed.js';
import { LEAK_GUIDANCE } from '../../shared/data/guidance.js';
import { ago, fmtDateTime } from '../../shared/services/format.js';
import { href, go } from '../../shared/services/router.js';
import Icon from '../shared/Icon.jsx';
import { Segmented, Empty, Badge, Button, useToast, useNow } from '../shared/ui.jsx';
import { MoveChart } from '../shared/visuals.jsx';
import { DeviceRow, KIND_ICON, deviceMeta } from './DeviceRow.jsx';
import { Page, BASE } from './Page.jsx';

const FILTERS = [['all', 'All'], ['leak', 'Leak sensors'], ['crack', 'Crack monitor'], ['hub', 'Hub']];

export default function Devices({ rest }) {
  if (rest[0]) return <DeviceDetail id={rest[0]} />;
  return <DeviceList />;
}

function DeviceList() {
  const { state } = useStore();
  const [f, setF] = useState('all');
  const hubOn = state.devices.hub.online;
  const all = Object.values(state.devices);
  const list = all.filter((d) => f === 'all' || d.kind === f);
  const rooms = ROOMS.filter((r) => list.some((d) => d.room === r.id));
  const count = (k) => all.filter((d) => k === 'all' || d.kind === k).length;
  const states = all.map((d) => deviceState(d, hubOn).key);
  return (
    <Page title="Devices">
      <p className="summary-line">
        <span><b className="num">{states.filter((k) => k === 'active').length}</b> working</span>
        <span><b className="num">{states.filter((k) => k === 'alert').length}</b> need attention</span>
        <span><b className="num">{states.filter((k) => k === 'offline').length}</b> offline</span>
      </p>
      <Segmented label="Device type" value={f} onChange={setF} options={FILTERS.map(([k, t]) => [k, t, count(k)])} />
      {rooms.map((r) => (
        <section key={r.id} className="section">
          <h2 className="room-h">{r.name}</h2>
          <ul className="devlist panel">{list.filter((d) => d.room === r.id).map((d) => <DeviceRow key={d.id} d={d} />)}</ul>
        </section>
      ))}
      {!rooms.length && <div className="panel"><Empty title="No devices of this type" /></div>}
    </Page>
  );
}

function DeviceDetail({ id }) {
  const { state, dispatch } = useStore();
  const toast = useToast();
  useNow(15000);
  const d = state.devices[id];
  if (!d) return <Page title="Device" back={['devices', 'Devices']}><div className="panel"><Empty title="This device no longer exists" /></div></Page>;
  const s = deviceState(d, state.devices.hub.online);
  const events = state.events.filter((e) => e.deviceId === id).slice(0, 8);
  const wo = d.woId && state.workOrders.find((w) => w.id === d.woId);
  return (
    <Page back={['devices', 'Devices']}>
      <div className="dev-hero">
        <span className={'dev-ic big s-' + s.key}><Icon name={KIND_ICON[d.kind]} size={26} /></span>
        <div>
          <h1>{d.name}</h1>
          <p className="muted">{d.spot}, {roomName(d.room).toLowerCase()}</p>
        </div>
        <Badge tone={s.tone}>{s.text}</Badge>
      </div>

      {d.kind === 'leak' && d.wet && s.key === 'alert' && (
        <section className="notice t-bad">
          <Icon name="drop" />
          <div>
            <b>{LEAK_GUIDANCE.what}</b>
            <ul className="tight">{LEAK_GUIDANCE.doNow.map((x) => <li key={x}>{x}</li>)}</ul>
            <div className="btnrow" style={{ marginTop: 10 }}>
              <Button variant="primary" size="sm" onClick={() => go(`${BASE}/maintenance/new/leak/${d.id}`)}>Request a plumber</Button>
              {!d.ack && <Button size="sm" onClick={() => { dispatch({ type: 'device/ack', id }); toast('Marked as handled', 'info'); }}>I've handled it</Button>}
            </div>
          </div>
        </section>
      )}

      {(d.kind === 'leak' || (d.kind === 'crack' && d.installed)) && <ul className="devlist panel"><DeviceRow d={d} controlsOnly /></ul>}

      {d.kind === 'crack' && d.installed && (
        <section className="section">
          <div className="section-head"><h2>Movement</h2><span className="small muted num">Latest {(lastReading(d) ?? 0).toFixed(2)} mm</span></div>
          <div className="panel panel-pad"><MoveChart readings={d.readings} limit={d.limit} /></div>
          <p className="small muted">The limit was set by your technician{wo ? ` on ${wo.id}` : ''}. Readings are relative to when the monitor was fitted. A photo or reading cannot tell you if a wall is safe; your technician decides what happens next.</p>
        </section>
      )}
      {d.kind === 'crack' && !d.installed && (
        <div className="panel panel-pad small">A crack monitor measures how much a crack opens or closes over time. It is fitted by a technician after they inspect a crack, so it is not installed in every home. If you see a crack, <a href={href(BASE + '/maintenance/new/crack')}>check it with a photo</a>.</div>
      )}

      <section className="section">
        <h2>Details</h2>
        <dl className="kv panel panel-pad">
          <dt>Status</dt><dd>{deviceMeta(d, s)}</dd>
          <dt>Last reading</dt><dd>{s.key === 'unavailable' ? '—' : ago(d.lastSeen)}</dd>
          {d.kind === 'leak' && <><dt>Detects</dt><dd>{LEAK_GUIDANCE.limit}</dd></>}
          {d.lastTest && <><dt>Last test</dt><dd>{fmtDateTime(d.lastTest)}</dd></>}
        </dl>
      </section>

      <section className="section">
        <h2>History</h2>
        {events.length ? (
          <ul className="rows panel">{events.map((e) => (
            <li key={e.id} className="row"><span className={'act-dot ' + (e.tone ? 't-' + e.tone : '')} aria-hidden="true" /><span className="row-main">{e.text}</span><span className="xs muted">{fmtDateTime(e.at)}</span></li>
          ))}</ul>
        ) : <div className="panel"><Empty title="Nothing recorded yet" /></div>}
      </section>
    </Page>
  );
}
