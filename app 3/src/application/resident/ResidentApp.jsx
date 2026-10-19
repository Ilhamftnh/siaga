import { useEffect } from 'react';
import { useStore } from '../../shared/services/store.jsx';
import { useRoute } from '../../shared/services/router.js';
import { loadModel } from '../../shared/services/crackModel.js';
import { RESIDENT } from '../../shared/data/seed.js';
import { AppShell, DemoBar } from '../shared/Shell.jsx';
import Home from './Home.jsx';
import MyHouse from './MyHouse.jsx';
import Devices from './Devices.jsx';
import Maintenance from './Maintenance.jsx';
import Notifications from './Notifications.jsx';
import Profile from './Profile.jsx';
import '../../styles/resident.css';

import { BASE } from './Page.jsx';

export default function ResidentApp() {
  const parts = useRoute();
  const { state } = useStore();
  const tab = parts[2] || 'home';
  const rest = parts.slice(3);
  useEffect(() => { loadModel(); }, []);
  useEffect(() => { document.title = 'SIAGA Home'; }, []);
  const unread = state.notifications.filter((n) => !n.read).length;
  const tabs = [
    { id: 'home', label: 'Home', icon: 'home' },
    { id: 'house', label: 'My House', short: 'House', icon: 'plan' },
    { id: 'devices', label: 'Devices', icon: 'devices' },
    { id: 'maintenance', label: 'Maintenance', icon: 'wrench' },
    { id: 'notifications', label: 'Notifications', icon: 'bell', badge: unread || null, desktopOnly: true },
    { id: 'profile', label: 'Profile', icon: 'user' },
  ];
  const screens = { home: Home, house: MyHouse, devices: Devices, maintenance: Maintenance, notifications: Notifications, profile: Profile };
  const Screen = screens[tab] || Home;
  return (
    <>
      <DemoBar current="app/resident" />
      <AppShell product="resident" base={BASE} tabs={tabs} active={screens[tab] ? tab : 'home'}
        footer={<div className="me"><span className="avatar">FH</span><div><b>{RESIDENT.name}</b><div className="muted xs">No. 12, Jalan Siaga 3</div></div></div>}>
        <Screen rest={rest} base={BASE} />
      </AppShell>
    </>
  );
}
