import { useEffect } from 'react';
import { href } from './shared/services/router.js';
import Icon from './application/shared/Icon.jsx';

const ITEMS = [
  { path: 'house', icon: 'house3d', title: 'House prototype', body: '3D model of a two-storey terrace home with three leak sensors, a crack monitor point and a hub. Use it to trigger leaks, take devices offline and move the crack.' },
  { path: 'app/resident', icon: 'home', title: 'Resident app', body: 'For the homeowner: home status, floor plan, devices, maintenance requests with the AI crack check, notifications.' },
  { path: 'app/technician', icon: 'wrench', title: 'Technician app', body: 'For maintenance staff: job queue, work orders and their workflow, device inspections, job history and an overview of the phase.' },
];

export default function Launcher() {
  useEffect(() => { document.title = 'SIAGA prototypes'; }, []);
  return (
    <div className="launcher">
      <header>
        <p className="launch-brand"><span className="mark" aria-hidden="true" />SIAGA</p>
        <h1>Wall crack detection and defect monitoring for new homes</h1>
        <p className="muted">Three connected prototypes for the Sime Darby Property University Hackathon 2026. Not affiliated with or endorsed by Sime Darby Property.</p>
      </header>
      <ul className="launch-list">
        {ITEMS.map((it) => (
          <li key={it.path}><a href={href(it.path)}>
            <Icon name={it.icon} size={22} />
            <span><b>{it.title}</b><span>{it.body}</span></span>
            <Icon name="right" size={18} className="chev" />
          </a></li>
        ))}
      </ul>
      <section className="launch-notes">
        <h2>Before you demo</h2>
        <ul>
          <li>Open the house prototype in one tab and an app in another, in the same browser. They share the same data, so a leak you trigger in the house appears in the resident app.</li>
          <li>Sensors are simulated. The crack AI is real: it runs the team's trained YOLOv8n model on your device.</li>
          <li>The resident, technicians and other homes are sample data. Reset it from the resident app's Profile.</li>
        </ul>
      </section>
    </div>
  );
}
