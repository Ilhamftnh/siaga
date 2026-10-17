import { useStore } from '../../shared/services/store.jsx';
import { href } from '../../shared/services/router.js';
import { dayKey, dayLabel, fmtTime } from '../../shared/services/format.js';
import Icon from '../shared/Icon.jsx';
import { Button, Empty } from '../shared/ui.jsx';
import { Page, BASE } from './Page.jsx';

const KIND = { alert: ['alert', 'Alert'], device: ['offline', 'Device'], update: ['wrench', 'Maintenance'], info: ['info', 'Info'] };

export default function Notifications() {
  const { state, dispatch } = useStore();
  const list = state.notifications;
  const unread = list.filter((n) => !n.read).length;
  const groups = [];
  list.forEach((n) => {
    const k = dayKey(n.at);
    let g = groups.find((x) => x.k === k);
    if (!g) { g = { k, items: [] }; groups.push(g); }
    g.items.push(n);
  });
  return (
    <Page title="Notifications">
      <div className="toolbar">
        <p className="small muted">{unread ? `${unread} unread` : 'All caught up'}</p>
        {unread > 0 && <Button size="sm" onClick={() => dispatch({ type: 'notif/read', id: 'all' })}>Mark all as read</Button>}
      </div>
      {groups.length ? groups.map((g) => (
        <section key={g.k} className="section">
          <h2 className="room-h">{dayLabel(g.k)}</h2>
          <ul className="rows panel">
            {g.items.map((n) => (
              <li key={n.id}>
                <a className={'row notif' + (n.read ? '' : ' unread') + ' k-' + n.kind} href={href(BASE + '/' + (n.link || 'home'))}
                  onClick={() => dispatch({ type: 'notif/read', id: n.id })}>
                  <span className="notif-ic"><Icon name={KIND[n.kind][0]} size={18} /></span>
                  <span className="row-main">
                    <span className="row-title">{n.title}<span className="sr">{n.read ? '' : ', unread'}</span></span>
                    <span className="row-sub">{n.body}</span>
                  </span>
                  <span className="row-end xs muted">{fmtTime(n.at)}</span>
                </a>
              </li>
            ))}
          </ul>
        </section>
      )) : <div className="panel"><Empty icon="bell" title="No notifications">Alerts from your sensors and updates on your requests will appear here.</Empty></div>}
      <p className="small muted">Choose which notifications you get in <a href={href(BASE + '/profile')}>Profile</a>.</p>
    </Page>
  );
}
