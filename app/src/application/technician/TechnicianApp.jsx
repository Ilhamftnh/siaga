import { useEffect } from 'react';
import { useStore } from '../../shared/services/store.jsx';
import { useRoute } from '../../shared/services/router.js';
import { OPEN_STATUSES, ME, techName } from '../../shared/data/seed.js';
import { AppShell, DemoBar } from '../shared/Shell.jsx';
import Dashboard from './Dashboard.jsx';
import WorkOrders from './WorkOrders.jsx';
import Inspections from './Inspections.jsx';
import History from './History.jsx';
import Overview from './Overview.jsx';
import { TBASE } from './common.jsx';
import '../../styles/technician.css';

export default function TechnicianApp() {
  const parts = useRoute();
  const { state } = useStore();
  useEffect(() => { document.title = 'SIAGA Field service'; }, []);
  const tab = parts[2] || 'dashboard';
  const rest = parts.slice(3);
  const newCount = state.workOrders.filter((w) => w.status === 'new').length;
  const tabs = [
    { id: 'dashboard', label: 'Dashboard', short: 'Today', icon: 'grid' },
    { id: 'work-orders', label: 'Work orders', short: 'Jobs', icon: 'list', badge: newCount || null },
    { id: 'inspections', label: 'Inspections', short: 'Inspect', icon: 'clipboard' },
    { id: 'history', label: 'Job history', short: 'History', icon: 'history' },
    { id: 'overview', label: 'Phase overview', short: 'Phase', icon: 'map' },
  ];
  const screens = { dashboard: Dashboard, 'work-orders': WorkOrders, inspections: Inspections, history: History, overview: Overview };
  const Screen = screens[tab] || Dashboard;
  const mine = state.workOrders.filter((w) => w.assignee === ME && OPEN_STATUSES.includes(w.status)).length;
  return (
    <>
      <DemoBar current="app/technician" />
      <AppShell product="technician" base={TBASE} tabs={tabs} active={screens[tab] ? tab : 'dashboard'}
        footer={<div className="me"><span className="avatar">HI</span><div><b>{techName(ME)}</b><div className="xs muted">Technician, {mine} open jobs</div></div></div>}>
        <Screen rest={rest} />
      </AppShell>
    </>
  );
}
