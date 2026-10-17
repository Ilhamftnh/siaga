import { useState } from 'react';
import { useStore, deviceState, lastReading } from '../../shared/services/store.jsx';
import { href } from '../../shared/services/router.js';
import { roomName } from '../../shared/data/seed.js';
import { ago } from '../../shared/services/format.js';
import Icon from '../shared/Icon.jsx';
import { Badge, Switch, Button, useToast } from '../shared/ui.jsx';
import { BASE } from './Page.jsx';

export { KIND_ICON } from '../shared/visuals.jsx';
import { KIND_ICON } from '../shared/visuals.jsx';
const STATE_ICON = { offline: 'offline', alert: 'alert', active: 'check', inactive: null, unavailable: null };

export function deviceMeta(d, s) {
  if (s.key === 'unavailable') return 'Fitted by a technician when a crack needs measuring';
  if (s.key === 'offline') return 'Last heard from ' + ago(d.lastSeen);
  if (d.kind === 'crack') { const r = lastReading(d); return `${r != null ? r.toFixed(2) : '0.00'} mm moved, limit ${d.limit} mm`; }
  if (d.kind === 'leak') return `Battery ${d.battery}%` + (d.lastTest ? `, tested ${ago(d.lastTest)}` : '');
  return 'Connected to home Wi-Fi';
}

// One device with its controls. Used on Devices and My House.
export function DeviceRow({ d, showRoom, controlsOnly }) {
  const { state, dispatch } = useStore();
  const toast = useToast();
  const [testing, setTesting] = useState(false);
  const hubOn = state.devices.hub.online;
  const s = deviceState(d, hubOn);
  const canAlert = d.kind !== 'hub' && s.key !== 'unavailable';

  function test() {
    setTesting(true);
    setTimeout(() => {
      dispatch({ type: 'device/test', id: d.id });
      setTesting(false);
      const ok = d.online && hubOn;
      toast(ok ? `Test passed. The sensor ${d.spot.toLowerCase()} responded.` : `Test failed. No response from the sensor ${d.spot.toLowerCase()}.`, ok ? 'ok' : 'info');
    }, 1200);
  }

  return (
    <li className={'dev s-' + s.key + (controlsOnly ? ' dev-controls' : '')}>
      {controlsOnly ? <span className="row-main small">{deviceMeta(d, s)}</span> : <a className="dev-main" href={href(BASE + '/devices/' + d.id)}>
        <span className="dev-ic"><Icon name={KIND_ICON[d.kind]} size={20} /></span>
        <span className="row-main">
          <span className="row-title">{d.name}</span>
          <span className="row-sub">{d.spot}{showRoom ? `, ${roomName(d.room).toLowerCase()}` : ''}</span>
          <span className="dev-meta">{deviceMeta(d, s)}</span>
        </span>
      </a>}
      <div className="dev-side">
        {!controlsOnly && <Badge tone={s.tone} icon={STATE_ICON[s.key]}>{s.text}</Badge>}
        <div className="dev-ctrl">
          {d.kind === 'leak' && (
            <Button size="sm" onClick={test} disabled={testing} aria-label={`Test the sensor ${d.spot.toLowerCase()}`}>{testing ? 'Testing…' : 'Test'}</Button>
          )}
          {canAlert && (
            <label className="dev-switch">
              <span className="xs muted">Alerts</span>
              <Switch checked={d.alerts} onChange={(v) => { dispatch({ type: 'device/alerts', id: d.id, on: v }); toast(v ? 'Alerts turned on' : 'Alerts turned off. The sensor still records readings.', 'info'); }}
                label={`Alerts for ${d.name.toLowerCase()} ${d.spot.toLowerCase()}`} />
            </label>
          )}
        </div>
      </div>
    </li>
  );
}
