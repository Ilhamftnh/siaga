import Icon from './Icon.jsx';
import { href } from '../../shared/services/router.js';

// Thin bar shown above every prototype so judges can move between the separate products.
export function DemoBar({ current }) {
  const items = [['house', 'House prototype'], ['app/resident', 'Resident app'], ['app/technician', 'Technician app']];
  return (
    <div className="demobar">
      <a className="demobar-home" href={href('')}>SIAGA prototypes</a>
      <nav aria-label="Switch prototype">
        {items.map(([p, t]) => <a key={p} href={href(p)} aria-current={current === p ? 'page' : undefined}>{t}</a>)}
      </nav>
      <span className="demobar-note">Sample data. Sensors simulated.</span>
    </div>
  );
}

// App frame: sidebar on wide screens, bottom tab bar on phones.
export function AppShell({ product, base, tabs, active, children, footer }) {
  return (
    <div className={'shell shell-' + product}>
      <aside className="sidebar" aria-label="Main">
        <div className="brand"><span className="mark" aria-hidden="true" />SIAGA<span className="brand-sub">{product === 'technician' ? 'Field service' : 'Home'}</span></div>
        <nav>
          {tabs.map((t) => (
            <a key={t.id} href={href(base + '/' + t.id)} aria-current={active === t.id ? 'page' : undefined}>
              <Icon name={t.icon} />{t.label}{t.badge ? <span className="navcount" aria-label={t.badge + ' unread'}>{t.badge}</span> : null}
            </a>
          ))}
        </nav>
        {footer && <div className="sidebar-foot">{footer}</div>}
      </aside>
      <div className="main">{children}</div>
      <nav className="tabbar" aria-label="Main">
        {tabs.filter((t) => !t.desktopOnly).map((t) => (
          <a key={t.id} href={href(base + '/' + t.id)} aria-current={active === t.id ? 'page' : undefined}>
            <span className="tab-ic"><Icon name={t.icon} size={22} />{t.badge ? <span className="dotcount">{t.badge}</span> : null}</span>
            <span>{t.short || t.label}</span>
          </a>
        ))}
      </nav>
    </div>
  );
}
