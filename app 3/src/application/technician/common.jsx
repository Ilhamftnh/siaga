import { homeAddress, PRIORITY, STATUS, OPEN_STATUSES } from '../../shared/data/seed.js';
import { href } from '../../shared/services/router.js';
import Icon from '../shared/Icon.jsx';

export const TBASE = 'app/technician';

export function TPage({ title, sub, actions, children, back }) {
  return (
    <>
      <header className="ttop">
        <div className="ttop-title">
          {back && <a className="topbar-back" href={href(TBASE + '/' + back[0])}><Icon name="left" size={18} />{back[1]}</a>}
          {title && <h1>{title}</h1>}
          {sub && <p className="small muted">{sub}</p>}
        </div>
        {actions && <div className="ttop-actions">{actions}</div>}
      </header>
      <main className="content tcontent" id="content">{children}</main>
    </>
  );
}

export const woLink = (w) => href(TBASE + '/work-orders/' + w.id);
export const shortAddr = (home) => homeAddress(home).replace('Jalan ', 'Jln ');
export const isOverdue = (w, now = Date.now()) => w.status === 'scheduled' && w.appointment && w.appointment < now - 30 * 60000;
export const isOpen = (w) => OPEN_STATUSES.includes(w.status);
export function sortQueue(a, b) {
  return (PRIORITY[a.priority].rank - PRIORITY[b.priority].rank) || (STATUS[a.status].step - STATUS[b.status].step) || (a.created - b.created);
}
