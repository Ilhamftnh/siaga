import { useStore } from '../../shared/services/store.jsx';
import { HOMES, DEMO_HOME } from '../../shared/data/seed.js';
import { duration } from '../../shared/services/format.js';
import { href } from '../../shared/services/router.js';
import { TPage, TBASE, isOpen } from './common.jsx';

const LEGEND = [['ok', 'No open jobs'], ['new', 'Request waiting'], ['open', 'Job in progress'], ['mon', 'Crack under monitoring'], ['bad', 'Urgent, overdue or active leak']];

export default function Overview() {
  const { state } = useStore();
  const W = state.workOrders;
  const dv = state.devices;
  const leakNow = Object.values(dv).some((d) => d.kind === 'leak' && d.wet && d.online && dv.hub.online);
  const homeState = (id) => {
    const ws = W.filter((w) => w.home === id && isOpen(w));
    if ((id === DEMO_HOME && (leakNow || dv['crack-w3'].over)) || ws.some((w) => w.priority === 'urgent' || (w.status === 'scheduled' && w.appointment < Date.now() - 1800000))) return 'bad';
    if (ws.some((w) => w.status === 'new')) return 'new';
    if (ws.some((w) => w.followUp && w.followUp.reason === 'monitoring')) return 'mon';
    if (ws.length) return 'open';
    return 'ok';
  };
  const responded = W.filter((w) => w.firstResponse);
  const avg = responded.length ? responded.reduce((a, w) => a + (w.firstResponse - w.created), 0) / responded.length : null;
  const ai = W.filter((w) => w.aiAgree);
  const agree = ai.filter((w) => w.aiAgree === 'Agree').length;
  const firstOpen = (id) => W.find((w) => w.home === id && isOpen(w));

  return (
    <TPage title="Phase overview" sub="Demo Township, Phase 2. Sample data mixed with this session's activity.">
      <dl className="statline">
        <div><dt>Open jobs</dt><dd className="num">{W.filter(isOpen).length}</dd></div>
        <div><dt>Waiting for assignment</dt><dd className="num">{W.filter((w) => w.status === 'new').length}</dd></div>
        <div><dt>Average time to first response</dt><dd className="num">{avg != null ? duration(avg) : '—'}</dd></div>
        <div><dt>Technician agreement with AI label</dt><dd className="num">{ai.length ? `${agree} of ${ai.length}` : 'No checks yet'}</dd></div>
      </dl>

      <section className="section">
        <h2>Homes</h2>
        <div className="panel panel-pad">
          <div className="homes" role="list">
            {HOMES.map((h) => {
              const s = homeState(h.id); const w = firstOpen(h.id);
              const label = `No. ${h.no}, ${h.street}: ${LEGEND.find((l) => l[0] === s)[1]}`;
              return w ? (
                <a key={h.id} role="listitem" className={'home h-' + s} href={href(TBASE + '/work-orders/' + w.id)} title={label} aria-label={label}>{h.no}</a>
              ) : (
                <span key={h.id} role="listitem" className={'home h-' + s} title={label} aria-label={label}>{h.no}</span>
              );
            })}
          </div>
          <ul className="legend">{LEGEND.map(([k, t]) => <li key={k}><i className={'home-key h-' + k} />{t}</li>)}</ul>
        </div>
      </section>

      <section className="section">
        <h2>What a pilot would measure</h2>
        <ul className="panel panel-pad measures small">
          <li>Leak sensor detection rate in planned water tests</li>
          <li>Time from sensor alert to the resident's phone, on real hardware</li>
          <li>AI precision and recall on new residents' photos, from technician agreement</li>
          <li>Time from request to first technician response</li>
          <li>Share of leak alerts that residents turn into a request</li>
        </ul>
        <p className="small muted">No pilot results exist yet. The figures above come from sample data in this demo.</p>
      </section>
    </TPage>
  );
}
