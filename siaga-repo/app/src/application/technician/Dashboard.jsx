import { useStore } from '../../shared/services/store.jsx';
import { ME, catName, techName } from '../../shared/data/seed.js';
import { fmtVisit, fmtTime, dayKey, dayLabel, ago, fmtDate } from '../../shared/services/format.js';
import { href } from '../../shared/services/router.js';
import { StatusBadge, PriorityBadge, Button, Empty, useToast, useNow } from '../shared/ui.jsx';
import Icon from '../shared/Icon.jsx';
import { TPage, TBASE, woLink, shortAddr, isOverdue, isOpen, sortQueue } from './common.jsx';

export default function Dashboard() {
  const { state, dispatch } = useStore();
  const toast = useToast();
  const now = useNow(30000);
  const W = state.workOrders;
  const mine = W.filter((w) => w.assignee === ME && isOpen(w)).sort(sortQueue);
  const waiting = W.filter((w) => w.status === 'new').sort(sortQueue);
  const overdue = mine.filter((w) => isOverdue(w, now));
  const crack = state.devices['crack-w3'];

  const priority = W.filter(isOpen).map((w) => {
    const reasons = [];
    if (crack.over && crack.woId === w.id) reasons.push(['bad', 'Crack monitor above limit']);
    if (isOverdue(w, now)) reasons.push(['warn', 'Visit overdue since ' + fmtVisit(w.appointment)]);
    if (w.priority === 'urgent') reasons.push(['bad', 'Urgent']);
    else if (w.priority === 'high' && !reasons.length) reasons.push(['warn', w.source === 'leak_sensor' ? 'Leak sensor alert' : w.signs.length ? 'Warning signs reported' : 'High priority']);
    return { w, reasons };
  }).filter((x) => x.reasons.length).sort((a, b) => sortQueue(a.w, b.w));

  const visits = mine.filter((w) => w.appointment && w.status === 'scheduled' && w.appointment > now - 30 * 60000 && w.appointment < now + 7 * 86400000)
    .sort((a, b) => a.appointment - b.appointment);
  const days = [...new Set(visits.map((w) => dayKey(w.appointment)))];
  const recent = W.filter((w) => w.status === 'completed' && w.completion).sort((a, b) => b.completion.at - a.completion.at).slice(0, 4);

  const today = new Date(now).toLocaleDateString('en-MY', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <TPage title={today}
      sub={`${mine.length} open job${mine.length === 1 ? '' : 's'} assigned to you${overdue.length ? `, ${overdue.length} overdue` : ''}. ${waiting.length} waiting for assignment.`}
      actions={<a className="btn btn-sm" href={href(TBASE + '/work-orders')}>All work orders</a>}>

      <section className="section">
        <div className="section-head"><h2>Needs attention</h2><span className="small muted">{priority.length}</span></div>
        {priority.length ? (
          <ul className="rows panel tlist">
            {priority.map(({ w, reasons }) => (
              <li key={w.id}><a className="row" href={woLink(w)}>
                <span className={'flag f-' + reasons[0][0]} aria-hidden="true" />
                <span className="row-main">
                  <span className="row-title"><span className="wid">{w.id}</span>{w.title}</span>
                  <span className="row-sub">{shortAddr(w.home)}, {reasons.map((r) => r[1]).join('; ')}</span>
                </span>
                <span className="row-end"><span className="desktop-only small muted">{w.assignee ? techName(w.assignee) : 'Unassigned'}</span><StatusBadge status={w.status} /></span>
              </a></li>
            ))}
          </ul>
        ) : <div className="panel"><Empty icon="check" title="Nothing urgent">High-priority, overdue and over-limit jobs will show here.</Empty></div>}
      </section>

      <div className="tgrid">
        <section className="section">
          <div className="section-head"><h2>My jobs</h2><a href={href(TBASE + '/work-orders/mine')}>View as table</a></div>
          {mine.length ? (
            <ul className="rows panel tlist">
              {mine.map((w) => (
                <li key={w.id}><a className="row" href={woLink(w)}>
                  <span className="row-main">
                    <span className="row-title"><span className="wid">{w.id}</span>{w.title}</span>
                    <span className="row-sub">{shortAddr(w.home)}, {catName(w.category).toLowerCase()}{w.appointment && w.status === 'scheduled' ? `, visit ${fmtVisit(w.appointment)}` : ''}</span>
                  </span>
                  <span className="row-end"><PriorityBadge p={w.priority} /><StatusBadge status={w.status} /></span>
                </a></li>
              ))}
            </ul>
          ) : <div className="panel"><Empty title="No jobs assigned to you">Pick one up from the waiting list.</Empty></div>}
        </section>

        <section className="section">
          <div className="section-head"><h2>Visits, next 7 days</h2></div>
          <div className="panel agenda">
            {days.length ? days.map((k) => (
              <div key={k} className="agenda-day">
                <h3>{dayLabel(k)}</h3>
                <ul>
                  {visits.filter((w) => dayKey(w.appointment) === k).map((w) => (
                    <li key={w.id}><a href={woLink(w)}>
                      <span className="agenda-time num">{fmtTime(w.appointment)}</span>
                      <span><b>{shortAddr(w.home)}</b><span className="small muted">{w.id}, {w.title}</span></span>
                    </a></li>
                  ))}
                </ul>
              </div>
            )) : <Empty icon="calendar" title="No visits booked">Schedule a visit from a work order.</Empty>}
          </div>
        </section>
      </div>

      <div className="tgrid">
        <section className="section">
          <div className="section-head"><h2>Waiting for assignment</h2><span className="small muted">{waiting.length}</span></div>
          {waiting.length ? (
            <ul className="rows panel tlist">
              {waiting.map((w) => (
                <li key={w.id} className="row">
                  <a className="row-main plain" href={woLink(w)}>
                    <span className="row-title"><span className="wid">{w.id}</span>{w.title}</span>
                    <span className="row-sub">{shortAddr(w.home)}, sent {ago(w.created, now)}</span>
                  </a>
                  <span className="row-end"><PriorityBadge p={w.priority} />
                    <Button size="sm" onClick={() => { dispatch({ type: 'wo/assign', id: w.id, tech: ME }); toast(`${w.id} assigned to you`); }}>Assign to me</Button>
                  </span>
                </li>
              ))}
            </ul>
          ) : <div className="panel"><Empty icon="check" title="Queue is clear">New requests from residents arrive here.</Empty></div>}
        </section>

        <section className="section">
          <div className="section-head"><h2>Recently completed</h2><a href={href(TBASE + '/history')}>Job history</a></div>
          <ul className="rows panel tlist">
            {recent.map((w) => (
              <li key={w.id}><a className="row" href={woLink(w)}>
                <Icon name="check" size={18} className="ok-ic" />
                <span className="row-main"><span className="row-title"><span className="wid">{w.id}</span>{w.title}</span>
                  <span className="row-sub">{shortAddr(w.home)}, {techName(w.completion.by)}, {fmtDate(w.completion.at)}</span></span>
              </a></li>
            ))}
          </ul>
        </section>
      </div>
    </TPage>
  );
}
