import { useStore, fmtDuration, fmtTime } from '../store.jsx';
import { HOMES } from '../data/seed.js';
import { Pill } from '../components/Bits.jsx';

const OPEN = ['submitted', 'inspect', 'urgent', 'repair', 'monitor'];

function homeState(id, s) {
  const rs = s.reports.filter((r) => r.home === id);
  const leakNow = (id === 'H12' && Object.values(s.leaks).some(Boolean)) || false;
  if (leakNow || rs.some((r) => r.status === 'urgent')) return 'bad';
  if (rs.some((r) => r.status === 'submitted')) return 'warn';
  if (rs.some((r) => r.status === 'monitor')) return 'mon';
  if (rs.some((r) => OPEN.includes(r.status))) return 'info';
  return 'ok';
}
const LEGEND = [['ok', 'No open issues'], ['warn', 'Report waiting for review'], ['info', 'Inspection or repair booked'], ['mon', 'Crack under monitoring'], ['bad', 'Active leak or urgent']];

export default function Management() {
  const { state, dispatch } = useStore();
  const open = state.reports.filter((r) => OPEN.includes(r.status));
  const waiting = state.reports.filter((r) => r.status === 'submitted');
  const decided = state.reports.filter((r) => r.decided);
  const avgResp = decided.length ? decided.reduce((a, r) => a + (r.decided - r.created), 0) / decided.length : null;
  const monitored = state.reports.filter((r) => r.status === 'monitor');
  const leakAlerts = state.alerts.length + state.sampleAlerts.length;
  const reportedShare = state.alerts.length ? state.alerts.filter((a) => a.reportId).length / state.alerts.length : null;
  const aiFeedback = state.reports.filter((r) => r.techAgree === 'Agree' || r.techAgree === 'Disagree');
  const aiAgree = aiFeedback.length ? aiFeedback.filter((r) => r.techAgree === 'Agree').length / aiFeedback.length : null;

  const kpis = [
    ['Open cases', open.length],
    ['Waiting for review', waiting.length],
    ['Average time to first decision', avgResp != null ? fmtDuration(avgResp) : '—'],
    ['Cracks under monitoring', monitored.length],
    ['Leak alerts (sample period)', leakAlerts],
    ['Technician agreement with AI label', aiAgree != null ? Math.round(aiAgree * 100) + '% of ' + aiFeedback.length : 'No feedback yet'],
  ];

  return (
    <div className="mgmt">
      <div className="mgmt-head">
        <div><div className="eyebrow">Property management · Demo Township, Phase 2 · sample data mixed with this session's actions</div><h1 className="h1">Defect overview</h1></div>
        <button className="btn ghost small" onClick={() => dispatch({ type: 'reset' })}>Reset demo data</button>
      </div>
      <div className="kpis">
        {kpis.map(([k, v]) => <div key={k} className="kpi"><span>{k}</span><b className={String(v).length > 8 ? 'sm' : ''}>{v}</b></div>)}
      </div>
      <div className="mgmt-grid">
        <section className="card">
          <h2 className="h2">Homes in this phase</h2>
          <div className="homes">
            {HOMES.map((h) => <div key={h.id} className={'home ' + homeState(h.id, state)} title={h.label + ', ' + h.street}>{h.label.replace('No. ', '')}{h.id === 'H12' && <i>you</i>}</div>)}
          </div>
          <div className="legend">{LEGEND.map(([k, t]) => <span key={k}><i className={'home ' + k} />{t}</span>)}</div>
        </section>
        <section className="card">
          <h2 className="h2">Pilot measures</h2>
          <ul className="small">
            <li>Leak sensor detection success rate (planned water tests)</li>
            <li>Sensor-to-notification time, measured on real hardware</li>
            <li>AI precision and recall on new household photos</li>
            <li>Time to prepare a defect report, with and without SIAGA</li>
            <li>Time from report to first technician decision</li>
            <li>Share of homeowners who complete a report after an alert{reportedShare != null ? ` (this session: ${Math.round(reportedShare * 100)}%)` : ''}</li>
            <li>Water lost per leak event, from measured flow and response time</li>
          </ul>
          <p className="muted small">Targets are set after the first pilot month. No results are claimed yet.</p>
        </section>
      </div>
      <section className="card">
        <h2 className="h2">Cases</h2>
        <div className="tablewrap">
          <table>
            <thead><tr><th>Case</th><th>Home</th><th>Type</th><th>AI label</th><th>Status</th><th>Created</th><th>First decision</th></tr></thead>
            <tbody>
              {state.reports.map((r) => (
                <tr key={r.id}>
                  <td>{r.id}{r.sample ? ' *' : ''}</td><td>{r.home.replace('H', 'No. ').replace('No. 0', 'No. ')}</td><td>{r.type === 'crack' ? 'Crack' : 'Leak'}</td>
                  <td>{r.ai ? r.ai.label + (r.ai.conf != null ? ' ' + r.ai.conf.toFixed(2) : '') : '—'}</td>
                  <td><Pill status={r.status} /></td><td>{fmtTime(r.created)}</td><td>{r.decided ? fmtDuration(r.decided - r.created) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="muted small">* Sample case for the demo.</p>
      </section>
    </div>
  );
}
