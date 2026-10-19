import { useState } from 'react';
import { useStore } from '../../shared/services/store.jsx';
import { ME, catName, techName, STATUS } from '../../shared/data/seed.js';
import { fmtDate, duration } from '../../shared/services/format.js';
import { Segmented, Badge, Empty } from '../shared/ui.jsx';
import { TPage, woLink, shortAddr } from './common.jsx';

export default function History() {
  const { state } = useStore();
  const [who, setWho] = useState('mine');
  const done = state.workOrders.filter((w) => ['completed', 'declined', 'cancelled'].includes(w.status))
    .filter((w) => who === 'all' || w.assignee === ME || (w.completion && w.completion.by === ME))
    .sort((a, b) => (b.completion?.at || b.updated) - (a.completion?.at || a.updated));
  return (
    <TPage title="Job history">
      <Segmented label="Whose jobs" value={who} onChange={setWho} options={[['mine', 'My jobs'], ['all', 'Everyone']]} />
      {done.length ? (
        <ul className="rows panel tlist history">
          {done.map((w) => (
            <li key={w.id}><a className="row" href={woLink(w)}>
              <span className="row-main">
                <span className="row-title"><span className="wid">{w.id}</span>{w.title}</span>
                <span className="row-sub">{shortAddr(w.home)}, {catName(w.category).toLowerCase()}, {w.assignee ? techName(w.assignee) : 'unassigned'}{w.completion ? `, ${fmtDate(w.completion.at)}` : ''}{w.completion && w.status === 'completed' ? `, ${duration(w.completion.at - w.created)} from request` : ''}</span>
                {w.completion && <span className="row-sub summary">{w.completion.summary}</span>}
              </span>
              <span className="row-end"><Badge tone={STATUS[w.status].tone} icon={null}>{STATUS[w.status].text}</Badge></span>
            </a></li>
          ))}
        </ul>
      ) : <div className="panel"><Empty icon="history" title="No finished jobs yet">Completed and declined jobs appear here.</Empty></div>}
    </TPage>
  );
}
