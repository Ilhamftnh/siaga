import { useStore, deviceState, lastReading } from '../../shared/services/store.jsx';
import { href, go } from '../../shared/services/router.js';
import { RESIDENT, DEMO_HOME, OPEN_STATUSES, STATUS, techName } from '../../shared/data/seed.js';
import { ago, fmtVisit } from '../../shared/services/format.js';
import Icon from '../shared/Icon.jsx';
import { Badge, StatusBadge, Button, useToast, useNow } from '../shared/ui.jsx';
import { Page, BASE } from './Page.jsx';

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
}

export function nextStep(w) {
  if (w.status === 'new') return 'Waiting for a technician to be assigned';
  if (w.status === 'assigned') return `${techName(w.assignee)} will arrange a visit`;
  if (w.status === 'scheduled') return `Visit ${fmtVisit(w.appointment)}`;
  if (w.status === 'in_progress') return `${techName(w.assignee)} is working on it`;
  if (w.status === 'follow_up') return w.followUp ? w.followUp.text : 'Follow-up needed';
  return STATUS[w.status].text;
}

export default function Home() {
  const { state, dispatch } = useStore();
  const toast = useToast();
  useNow(30000);
  const dv = state.devices;
  const hubOn = dv.hub.online;
  const leaks = Object.values(dv).filter((d) => d.kind === 'leak');
  const wet = leaks.filter((d) => deviceState(d, hubOn).key === 'alert');
  const offline = Object.values(dv).filter((d) => deviceState(d, hubOn).key === 'offline');
  const crack = dv['crack-w3'];
  const open = state.workOrders.filter((w) => w.home === DEMO_HOME && OPEN_STATUSES.includes(w.status));

  const activity = [
    ...state.events.filter((e) => dv[e.deviceId]).map((e) => ({ at: e.at, text: e.text, where: dv[e.deviceId].spot, tone: e.tone, link: 'devices/' + e.deviceId })),
    ...state.workOrders.filter((w) => w.home === DEMO_HOME).flatMap((w) => w.timeline.map((t) => ({ at: t.at, text: t.text, where: w.id + ', ' + w.title.toLowerCase(), link: 'maintenance/' + w.id }))),
  ].sort((a, b) => b.at - a.at).slice(0, 5);

  function testAll() {
    leaks.forEach((d) => dispatch({ type: 'device/test', id: d.id }));
    const failed = leaks.filter((d) => !d.online || !hubOn);
    toast(failed.length ? `${leaks.length - failed.length} of ${leaks.length} sensors responded. Check: ${failed.map((d) => d.spot.toLowerCase()).join(', ')}.` : `All ${leaks.length} leak sensors responded.`, failed.length ? 'info' : 'ok');
  }

  let status;
  if (wet.length) status = { tone: 'bad', icon: 'drop', title: wet.length > 1 ? `Water detected at ${wet.length} sensors` : `Water detected ${wet[0].spot.toLowerCase()}`, sub: 'Check the area. If water is still coming, close the tap or valve under the sink.' };
  else if (crack.installed && crack.over) status = { tone: 'bad', icon: 'crack', title: 'Crack movement above the limit', sub: `Window W3 has moved ${lastReading(crack).toFixed(2)} mm. Your technician has been told.` };
  else if (offline.length) status = { tone: 'warn', icon: 'offline', title: offline.length > 1 ? `${offline.length} devices offline` : `${offline[0].kind === 'hub' ? 'The SIAGA hub' : 'A ' + offline[0].name.toLowerCase()} is offline`, sub: 'Alerts from it cannot reach you until it reconnects.' };
  else status = { tone: 'ok', icon: 'check', title: 'All sensors normal', sub: `${leaks.length} leak sensors dry${crack.installed ? ', crack monitor within its limit' : ''}. Hub online.` };

  return (
    <Page head={<div className="greet"><h1>{greeting()}, {RESIDENT.first}</h1><p className="muted small">No. 12, Jalan Siaga 3</p></div>}>
      <section className={'homestatus hs-' + status.tone} aria-live="polite">
        <span className="hs-ic"><Icon name={status.icon} size={22} /></span>
        <div className="hs-text">
          <h2>{status.title}</h2>
          <p>{status.sub}</p>
          {wet.length > 0 && (
            <div className="btnrow">
              <Button variant="primary" size="sm" onClick={() => go(`${BASE}/maintenance/new/leak/${wet[0].id}`)}>Request a plumber</Button>
              {!wet[0].ack && <Button size="sm" onClick={() => { dispatch({ type: 'device/ack', id: wet[0].id }); toast('Marked as handled. The sensor keeps watching.', 'info'); }}>I've handled it</Button>}
            </div>
          )}
        </div>
      </section>

      <div className="quick" role="group" aria-label="Quick actions">
        <a className="quick-btn" href={href(BASE + '/maintenance/new')}><Icon name="plus" />Report an issue</a>
        <a className="quick-btn" href={href(BASE + '/maintenance/new/crack')}><Icon name="camera" />Check a wall crack</a>
        <button type="button" className="quick-btn" onClick={testAll}><Icon name="play" />Test leak sensors</button>
      </div>

      <div className="home-cols">
        <section className="section">
          <div className="section-head"><h2>Devices</h2><a href={href(BASE + '/devices')}>All devices</a></div>
          <ul className="rows panel">
            <li><a className="row" href={href(BASE + '/devices')}>
              <Icon name="drop" className="muted" />
              <span className="row-main"><span className="row-title">Leak sensors</span><span className="row-sub">Kitchen, bathroom, laundry</span></span>
              <span className="row-end">{wet.length ? <Badge tone="bad">{wet.length} wet</Badge> : <span className="small num">{leaks.filter((d) => deviceState(d, hubOn).key === 'active').length} of {leaks.length} dry</span>}</span>
            </a></li>
            <li><a className="row" href={href(BASE + '/devices/crack-w3')}>
              <Icon name="crack" className="muted" />
              <span className="row-main"><span className="row-title">Crack monitor</span><span className="row-sub">Side wall, window W3</span></span>
              <span className="row-end small num">{crack.installed ? `${(lastReading(crack) ?? 0).toFixed(2)} / ${crack.limit} mm` : <span className="muted">Not installed</span>}</span>
            </a></li>
            <li><a className="row" href={href(BASE + '/devices/hub')}>
              <Icon name="hub" className="muted" />
              <span className="row-main"><span className="row-title">SIAGA hub</span><span className="row-sub">Hall</span></span>
              <span className="row-end small">{hubOn ? 'Online' : <Badge tone="off" icon="offline">Offline</Badge>}</span>
            </a></li>
          </ul>
        </section>

        <section className="section">
          <div className="section-head"><h2>Maintenance</h2><a href={href(BASE + '/maintenance')}>All requests</a></div>
          {open.length ? (
            <ul className="rows panel">
              {open.map((w) => (
                <li key={w.id}><a className="row" href={href(BASE + '/maintenance/' + w.id)}>
                  <span className="row-main"><span className="row-title">{w.title}</span><span className="row-sub">{nextStep(w)}</span></span>
                  <span className="row-end"><StatusBadge status={w.status} /></span>
                </a></li>
              ))}
            </ul>
          ) : (
            <div className="panel quiet">No open requests. Anything that needs fixing, <a href={href(BASE + '/maintenance/new')}>report it here</a>.</div>
          )}
        </section>
      </div>

      <section className="section">
        <div className="section-head"><h2>Recent activity</h2></div>
        <ul className="rows panel activity">
          {activity.map((a, i) => (
            <li key={i}><a className="row" href={href(BASE + '/' + a.link)}>
              <span className={'act-dot ' + (a.tone ? 't-' + a.tone : '')} aria-hidden="true" />
              <span className="row-main"><span className="row-title">{a.text}</span><span className="row-sub">{a.where}</span></span>
              <span className="row-end xs muted">{ago(a.at)}</span>
            </a></li>
          ))}
        </ul>
      </section>
    </Page>
  );
}
