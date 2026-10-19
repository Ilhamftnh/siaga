import { useState } from 'react';
import { useStore } from '../../shared/services/store.jsx';
import { ROOMS, FLOORS, RESIDENT, roomName } from '../../shared/data/seed.js';
import { fmtDate } from '../../shared/services/format.js';
import { href } from '../../shared/services/router.js';
import { Segmented, Empty } from '../shared/ui.jsx';
import { FloorPlan } from '../shared/visuals.jsx';
import { DeviceRow } from './DeviceRow.jsx';
import { Page, BASE } from './Page.jsx';

export default function MyHouse() {
  const { state } = useStore();
  const [floor, setFloor] = useState('ground');
  const [room, setRoom] = useState('kitchen');
  const devices = Object.values(state.devices).filter((d) => d.room === room);
  const pick = (f) => { setFloor(f); setRoom(ROOMS.find((r) => r.floor === f).id); };

  return (
    <Page title="My House">
      <div className="house-head">
        <dl className="house-facts">
          <div><dt>Home</dt><dd>No. 12, Jalan Siaga 3</dd></div>
          <div><dt>Type</dt><dd>{RESIDENT.type}</dd></div>
          <div><dt>Keys handed over</dt><dd>{state.handover ? fmtDate(state.handover.at) : 'Not yet'}</dd></div>
        </dl>
        <Segmented label="Floor" value={floor} onChange={pick} options={FLOORS.map((f) => [f.id, f.name])} />
      </div>

      <div className="house-grid">
        <div className="panel plan-panel">
          <FloorPlan floor={floor} devices={state.devices} selected={room} onSelect={setRoom} />
          <ul className="legend" aria-label="Legend">
            <li><i className="lg ok" />Normal</li>
            <li><i className="lg bad" />Needs attention</li>
            <li><i className="lg off" />Offline or alerts off</li>
            <li><i className="lg na" />Not installed</li>
          </ul>
        </div>
        <section className="section" aria-live="polite">
          <div className="section-head"><h2>{roomName(room)}</h2><span className="small muted">{devices.length} device{devices.length === 1 ? '' : 's'}</span></div>
          {devices.length ? (
            <ul className="devlist panel">{devices.map((d) => <DeviceRow key={d.id} d={d} />)}</ul>
          ) : (
            <div className="panel"><Empty icon="devices" title="No SIAGA devices in this room">
              SIAGA sensors are placed where leaks and cracks are most likely. <a href={href(BASE + '/maintenance/new')}>Report an issue</a> for anything else here.
            </Empty></div>
          )}
          {room === 'living' && (
            <p className="small muted">The side wall at window W3 had a fine crack recorded at handover. <a href={href(BASE + '/profile/inspection')}>See the handover inspection</a>.</p>
          )}
        </section>
      </div>
    </Page>
  );
}
