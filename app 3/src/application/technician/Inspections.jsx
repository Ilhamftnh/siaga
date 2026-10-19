import { useState } from 'react';
import { useStore, deviceState, lastReading } from '../../shared/services/store.jsx';
import { DEMO_HOME, ME, techName, homeAddress } from '../../shared/data/seed.js';
import { fmtDateTime, fmtDate, ago } from '../../shared/services/format.js';
import { href, go } from '../../shared/services/router.js';
import Icon from '../shared/Icon.jsx';
import { Badge, Button, Field, Empty, Confirm, useToast } from '../shared/ui.jsx';
import { KIND_ICON } from '../shared/visuals.jsx';
import { TPage, TBASE, shortAddr, isOpen } from './common.jsx';

const RESULT = { ok: ['ok', 'No fault'], potential: ['warn', 'Potential issue'], confirmed: ['bad', 'Confirmed fault'] };

export default function Inspections({ rest }) {
  if (rest[0] === 'new') return <NewInspection woId={rest[1]} />;
  if (rest[0]) return <Record id={rest[0]} />;
  return <List />;
}

function counts(items) {
  return { confirmed: items.filter((i) => i.result === 'confirmed').length, potential: items.filter((i) => i.result === 'potential').length };
}

function List() {
  const { state } = useStore();
  return (
    <TPage title="Inspections" actions={<a className="btn btn-primary btn-sm" href={href(TBASE + '/inspections/new')}><Icon name="plus" size={16} />Inspect devices</a>}>
      <p className="small muted">Device inspections record what you found at a home's SIAGA devices. Handover inspections are the starting record for each home. In the demo, only No. 12, Jalan Siaga 3 has devices registered.</p>
      <div className="panel tablewrap">
        <table className="wotable">
          <thead><tr><th scope="col">Record</th><th scope="col">Property</th><th scope="col" className="hide-sm">Type</th><th scope="col">Findings</th><th scope="col" className="hide-sm">By</th><th scope="col" className="hide-md">Date</th></tr></thead>
          <tbody>
            {state.inspections.map((r) => {
              const c = counts(r.items);
              return (
                <tr key={r.id} onClick={() => go(TBASE + '/inspections/' + r.id)}>
                  <td><a href={href(TBASE + '/inspections/' + r.id)} onClick={(e) => e.stopPropagation()}><b className="wid">{r.id}</b></a>{r.woId && <span className="cell-sub">{r.woId}</span>}</td>
                  <td>{shortAddr(r.home)}</td>
                  <td className="hide-sm">{r.type === 'handover' ? 'Handover' : 'Device'}</td>
                  <td>
                    <span className="findings">
                      {c.confirmed > 0 && <Badge tone="bad" icon={null}>{c.confirmed} confirmed</Badge>}
                      {c.potential > 0 && <Badge tone="warn" icon={null}>{c.potential} potential</Badge>}
                      {!c.confirmed && !c.potential && <Badge tone="ok" icon={null}>No faults</Badge>}
                    </span>
                  </td>
                  <td className="hide-sm">{r.by}</td>
                  <td className="hide-md">{fmtDate(r.at)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </TPage>
  );
}

function Record({ id }) {
  const { state } = useStore();
  const r = state.inspections.find((x) => x.id === id);
  if (!r) return <TPage title="Inspection" back={['inspections', 'Inspections']}><div className="panel"><Empty title={`${id} not found`} /></div></TPage>;
  return (
    <TPage title={`${r.type === 'handover' ? 'Handover inspection' : 'Device inspection'} ${r.id}`} sub={`${homeAddress(r.home)}, ${fmtDateTime(r.at)}, ${r.by}`} back={['inspections', 'Inspections']}>
      {r.woId && <p className="small">For work order <a href={href(TBASE + '/work-orders/' + r.woId)}>{r.woId}</a></p>}
      <ul className="rows panel">
        {r.items.map((it, i) => (
          <li key={i} className="row">
            <span className="row-main"><span className="row-title">{it.area}</span><span className="row-sub">{it.note || 'No note'}</span>{it.reading && <span className="row-sub">Reading at inspection: {it.reading}</span>}</span>
            <Badge tone={RESULT[it.result][0]} icon={null}>{RESULT[it.result][1]}</Badge>
          </li>
        ))}
      </ul>
      {r.type === 'handover' && <p className="small muted">Sample handover record. A qualified inspector completes it before keys are handed over; it is the baseline that later reports are compared with.</p>}
    </TPage>
  );
}

function NewInspection({ woId }) {
  const { state, dispatch } = useStore();
  const toast = useToast();
  const devices = Object.values(state.devices).filter((d) => !(d.kind === 'crack' && !d.installed));
  const openWos = state.workOrders.filter((w) => w.home === DEMO_HOME && isOpen(w));
  const [wo, setWo] = useState(woId && openWos.some((w) => w.id === woId) ? woId : '');
  const [res, setRes] = useState(() => Object.fromEntries(devices.map((d) => [d.id, { result: 'ok', note: '' }])));
  const [other, setOther] = useState({ area: '', result: 'potential', note: '' });
  const [errs, setErrs] = useState({});
  const [confirm, setConfirm] = useState(false);
  const hubOn = state.devices.hub.online;
  const set = (id, patch) => setRes((r) => ({ ...r, [id]: { ...r[id], ...patch } }));

  function check() {
    const e = {};
    devices.forEach((d) => { if (res[d.id].result !== 'ok' && res[d.id].note.trim().length < 5) e[d.id] = 'Describe the issue so it can be followed up.'; });
    if (other.area.trim() && other.note.trim().length < 5) e.other = 'Add a note for this finding.';
    setErrs(e);
    return !Object.keys(e).length;
  }
  function save() {
    const items = devices.map((d) => {
      const s = deviceState(d, hubOn);
      const reading = d.kind === 'crack' ? `${(lastReading(d) ?? 0).toFixed(2)} mm` : s.text;
      return { area: d.spot, deviceId: d.id, result: res[d.id].result, note: res[d.id].note.trim(), reading };
    });
    if (other.area.trim()) items.push({ area: other.area.trim(), result: other.result, note: other.note.trim() });
    dispatch({ type: 'inspection/save', record: { home: DEMO_HOME, type: 'device', by: techName(ME), woId: wo || null, items } });
    const id = 'INS-0' + state.nextIns;
    toast(`Inspection ${id} saved`);
    go(wo ? `${TBASE}/work-orders/${wo}` : `${TBASE}/inspections/${id}`);
  }

  return (
    <TPage title="Inspect devices" sub={homeAddress(DEMO_HOME)} back={woId ? [`work-orders/${woId}`, woId] : ['inspections', 'Inspections']}>
      <Field label="Work order" htmlFor="iwo" optional hint="Findings are added to the work order's log">
        <select id="iwo" className="select" value={wo} onChange={(e) => setWo(e.target.value)}>
          <option value="">Not linked to a work order</option>
          {openWos.map((w) => <option key={w.id} value={w.id}>{w.id}, {w.title}</option>)}
        </select>
      </Field>

      <ul className="insp-list">
        {devices.map((d) => {
          const s = deviceState(d, hubOn);
          const evs = state.events.filter((e) => e.deviceId === d.id).slice(0, 3);
          const r = res[d.id];
          return (
            <li key={d.id} className={'panel insp' + (errs[d.id] ? ' has-error' : '')}>
              <div className="insp-head">
                <span className={'dev-ic s-' + s.key}><Icon name={KIND_ICON[d.kind]} size={18} /></span>
                <div className="row-main"><b>{d.name}</b><span className="row-sub">{d.spot}</span></div>
                <Badge tone={s.tone}>{s.text}</Badge>
              </div>
              <div className="insp-diag">
                <h3>Recent diagnostics</h3>
                <ul>
                  {d.kind === 'leak' && <li>{d.power === 'wired' ? 'Mains powered (5 V adapter)' : `Battery ${d.battery}%`}{d.lastTest ? `, last test ${ago(d.lastTest)}` : ', not tested since handover'}</li>}
                  {d.kind === 'crack' && <li>Latest {(lastReading(d) ?? 0).toFixed(2)} mm against a {d.limit} mm limit</li>}
                  {evs.map((e) => <li key={e.id}>{e.text}, {ago(e.at)}</li>)}
                  {!evs.length && d.kind === 'hub' && <li>No faults logged</li>}
                </ul>
              </div>
              <fieldset className="insp-result">
                <legend className="sr">Result for {d.spot}</legend>
                {Object.entries(RESULT).map(([k, [, t]]) => (
                  <label key={k} className={'rchip r-' + k}><input type="radio" name={'r-' + d.id} checked={r.result === k} onChange={() => set(d.id, { result: k })} />{t}</label>
                ))}
              </fieldset>
              <Field label="Note" htmlFor={'n-' + d.id} optional={r.result === 'ok'} error={errs[d.id]}>
                <input id={'n-' + d.id} className="input" value={r.note} onChange={(e) => set(d.id, { note: e.target.value })}
                  placeholder={r.result === 'ok' ? 'For example: Tested with water, alarm in 3 s' : 'What you found'} />
              </Field>
            </li>
          );
        })}
        <li className={'panel insp' + (errs.other ? ' has-error' : '')}>
          <div className="insp-head"><span className="dev-ic s-unavailable"><Icon name="plus" size={18} /></span><div className="row-main"><b>Other finding</b><span className="row-sub">Anything not covered by a device, for example a new crack</span></div></div>
          <Field label="Where" htmlFor="oa" optional><input id="oa" className="input" value={other.area} onChange={(e) => setOther({ ...other, area: e.target.value })} placeholder="For example: Kitchen wall above the sink" /></Field>
          {other.area.trim() && (
            <>
              <fieldset className="insp-result"><legend className="sr">Result</legend>
                {Object.entries(RESULT).map(([k, [, t]]) => (
                  <label key={k} className={'rchip r-' + k}><input type="radio" name="r-other" checked={other.result === k} onChange={() => setOther({ ...other, result: k })} />{t}</label>
                ))}
              </fieldset>
              <Field label="Note" htmlFor="on" error={errs.other}><input id="on" className="input" value={other.note} onChange={(e) => setOther({ ...other, note: e.target.value })} /></Field>
            </>
          )}
        </li>
      </ul>
      <div className="btnrow"><Button variant="primary" onClick={() => { if (check()) setConfirm(true); }}>Save inspection</Button></div>
      <Confirm open={confirm} onClose={() => setConfirm(false)} title="Save this inspection?" confirmLabel="Save inspection"
        body={`Results for ${devices.length} device${devices.length === 1 ? '' : 's'}${other.area.trim() ? ' and 1 other finding' : ''} will be recorded${wo ? ` and added to ${wo}` : ''}.`}
        onConfirm={save} />
    </TPage>
  );
}
