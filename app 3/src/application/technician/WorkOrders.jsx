import { useState } from 'react';
import { useStore } from '../../shared/services/store.jsx';
import { ME, CATEGORIES, catName, techName } from '../../shared/data/seed.js';
import { fmtVisit, ago } from '../../shared/services/format.js';
import { go } from '../../shared/services/router.js';
import Icon from '../shared/Icon.jsx';
import { StatusBadge, PriorityBadge, Segmented, Empty, useNow } from '../shared/ui.jsx';
import WorkOrder from './WorkOrder.jsx';
import { TPage, TBASE, shortAddr, isOverdue, isOpen, sortQueue } from './common.jsx';

export default function WorkOrders({ rest }) {
  if (rest[0] && rest[0].startsWith('WO-')) return <WorkOrder id={rest[0]} />;
  return <List initial={rest[0] === 'mine' ? 'mine' : 'open'} />;
}

const VIEWS = [
  ['open', 'Open', isOpen],
  ['mine', 'Mine', (w) => w.assignee === ME && isOpen(w)],
  ['new', 'New', (w) => w.status === 'new'],
  ['follow_up', 'Follow-up', (w) => w.status === 'follow_up'],
  ['closed', 'Closed', (w) => !isOpen(w)],
];

function List({ initial }) {
  const { state } = useStore();
  const now = useNow(30000);
  const [view, setView] = useState(initial);
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('');
  const W = state.workOrders;
  const fn = VIEWS.find((v) => v[0] === view)[2];
  const term = q.trim().toLowerCase();
  const list = W.filter(fn).filter((w) => !cat || w.category === cat)
    .filter((w) => !term || [w.id, w.title, shortAddr(w.home), techName(w.assignee)].some((x) => x.toLowerCase().includes(term)))
    .sort(view === 'closed' ? (a, b) => b.updated - a.updated : sortQueue);

  return (
    <TPage title="Work orders">
      <div className="filters">
        <Segmented label="View" value={view} onChange={setView} options={VIEWS.map(([k, t, f]) => [k, t, W.filter(f).length])} />
        <div className="filter-fields">
          <label className="search"><Icon name="search" size={18} /><span className="sr">Search work orders</span>
            <input className="input" type="search" placeholder="Search ID, address, technician" value={q} onChange={(e) => setQ(e.target.value)} /></label>
          <label><span className="sr">Category</span>
            <select className="select" value={cat} onChange={(e) => setCat(e.target.value)}>
              <option value="">All categories</option>
              {CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select></label>
        </div>
      </div>

      {list.length ? (
        <div className="panel tablewrap">
          <table className="wotable">
            <thead><tr>
              <th scope="col">Job</th><th scope="col">Property</th><th scope="col" className="hide-sm">Category</th><th scope="col">Priority</th>
              <th scope="col">Status</th><th scope="col" className="hide-sm">Assigned</th><th scope="col" className="hide-md">Visit</th><th scope="col" className="hide-md">Updated</th>
            </tr></thead>
            <tbody>
              {list.map((w) => (
                <tr key={w.id} onClick={() => go(TBASE + '/work-orders/' + w.id)} className={isOverdue(w, now) ? 'overdue' : ''}>
                  <td><a href={'#/' + TBASE + '/work-orders/' + w.id} onClick={(e) => e.stopPropagation()}><b className="wid">{w.id}</b></a><span className="cell-sub">{w.title}</span></td>
                  <td>{shortAddr(w.home)}</td>
                  <td className="hide-sm">{catName(w.category)}</td>
                  <td><PriorityBadge p={w.priority} /></td>
                  <td><StatusBadge status={w.status} />{isOverdue(w, now) && <span className="cell-sub t-overdue">Overdue</span>}</td>
                  <td className="hide-sm">{w.assignee ? techName(w.assignee) : <span className="muted">Unassigned</span>}</td>
                  <td className="hide-md num">{w.appointment ? fmtVisit(w.appointment) : <span className="muted">—</span>}</td>
                  <td className="hide-md muted">{ago(w.updated, now)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : <div className="panel"><Empty icon="search" title="No work orders match">Try another view or clear the search.</Empty></div>}
    </TPage>
  );
}
