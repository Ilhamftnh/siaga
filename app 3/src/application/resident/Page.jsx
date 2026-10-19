import { useEffect, useState } from 'react';
import { useStore } from '../../shared/services/store.jsx';
import { href } from '../../shared/services/router.js';
import Icon from '../shared/Icon.jsx';

export const BASE = 'app/resident';

// Page frame used by every resident screen: sticky header, then content
export function Page({ title, back, head, children, className = '' }) {
  return (
    <>
      <TopBar title={title} back={back}>{head}</TopBar>
      <main className={'content ' + className} id="content">{children}</main>
    </>
  );
}

export function TopBar({ title, back, children }) {
  const { state } = useStore();
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 4);
    window.addEventListener('scroll', on, { passive: true });
    return () => window.removeEventListener('scroll', on);
  }, []);
  const unread = state.notifications.filter((n) => !n.read).length;
  return (
    <header className={'topbar' + (scrolled ? ' scrolled' : '')}>
      <div className="topbar-title">
        {back && <a className="topbar-back" href={href(BASE + '/' + back[0])}><Icon name="left" size={18} />{back[1]}</a>}
        {title && <h1>{title}</h1>}
        {children}
      </div>
      <a className="iconbtn mobile-only" href={href(BASE + '/notifications')} aria-label={`Notifications, ${unread} unread`}>
        <Icon name="bell" size={22} />{unread > 0 && <span className="dotcount">{unread}</span>}
      </a>
      <a className="mobile-only" href={href(BASE + '/profile')} aria-label="Profile"><span className="avatar">FH</span></a>
    </header>
  );
}

