// Shared demonstration data layer.
// The house prototype and the resident and technician apps read and write the same state.
// It is kept in the browser (localStorage) and synchronised between open tabs, so the house
// can run in one tab and the apps in another. A real deployment would replace this with a backend API.

import { createContext, useContext, useEffect, useReducer, useRef } from 'react';
import { seedState, preHandoverState, DEMO_HOME, techName, catName, STATUS, ME } from '../data/seed.js';

const KEY = 'siaga-demo-v5';

function load() {
  try {
    const s = JSON.parse(localStorage.getItem(KEY));
    if (s && s.v === 5) return s;
  } catch (e) { /* storage unavailable */ }
  return seedState();
}

let seq = 0;
const uid = (p) => p + Date.now().toString(36) + (seq++).toString(36);

function notify(s, n) {
  // n.pref: which resident preference controls this notification
  if (n.pref && s.prefs[n.pref] === false) return s;
  return { ...s, notifications: [{ id: uid('N'), at: Date.now(), read: false, kind: 'info', ...n }, ...s.notifications].slice(0, 80) };
}
function logEvent(s, deviceId, text, tone) {
  return { ...s, events: [{ id: uid('E'), at: Date.now(), deviceId, text, tone }, ...s.events].slice(0, 120) };
}
function setDevice(s, id, patch) {
  return { ...s, devices: { ...s.devices, [id]: { ...s.devices[id], ...patch } } };
}
function setWo(s, id, fn) {
  return { ...s, workOrders: s.workOrders.map((w) => (w.id === id ? { ...fn(w), updated: Date.now() } : w)) };
}
const line = (w, text) => [...(w.timeline || []), { at: Date.now(), text }];
const where = (d) => d.spot.charAt(0).toLowerCase() + d.spot.slice(1);

// Resident-facing update when a job for the demo home changes
function residentUpdate(s, w, title, body) {
  if (w.home !== DEMO_HOME) return s;
  return notify(s, { title, body: `${w.id}, ${w.title.toLowerCase()}: ${body}`, kind: 'update', link: 'maintenance/' + w.id, pref: 'maintenance' });
}

const INSPECTOR = 'Nurul Aina, building inspector (sample)';

function reducer(s, a) {
  switch (a.type) {
    case 'hydrate':
      return a.state;

    // ---------- house prototype (simulated hardware) ----------
    case 'sim/leak': {
      const d = s.devices[a.id];
      if (!d || d.wet === a.wet) return s;
      let n = setDevice(s, a.id, { wet: a.wet, ack: false, lastSeen: Date.now() });
      if (!d.online || !s.devices.hub.online) return n; // an offline sensor (or hub) cannot report
      if (a.wet) {
        n = logEvent(n, a.id, 'Water detected', 'bad');
        if (d.alerts) n = notify(n, { title: 'Water detected', body: `The leak sensor ${where(d)} is wet. Check the area now.`, kind: 'alert', link: 'devices/' + a.id, pref: 'leakAlerts' });
      } else {
        n = logEvent(n, a.id, 'Dry again', 'ok');
        if (d.alerts) n = notify(n, { title: 'Sensor dry again', body: `The leak sensor ${where(d)} no longer detects water.`, kind: 'info', link: 'devices/' + a.id, pref: 'leakAlerts' });
      }
      return n;
    }
    case 'sim/online': {
      const d = s.devices[a.id];
      if (!d || d.online === a.online) return s;
      let n = setDevice(s, a.id, { online: a.online, lastSeen: Date.now() });
      n = logEvent(n, a.id, a.online ? 'Back online' : 'Stopped responding', a.online ? 'ok' : 'warn');
      const label = d.kind === 'hub' ? 'The SIAGA hub' : `The ${d.name.toLowerCase()} ${where(d)}`;
      n = notify(n, a.online
        ? { title: 'Device back online', body: `${label} is reporting again.`, kind: 'info', link: 'devices/' + a.id, pref: 'device' }
        : { title: 'Device offline', body: `${label} has stopped responding. Check its power and Wi-Fi.`, kind: 'device', link: 'devices/' + a.id, pref: 'device' });
      return n;
    }
    case 'sim/crack':
      return { ...s, sim: { ...s.sim, crackMm: a.mm } };
    case 'tick': {
      // Only the house prototype tab (the simulated hardware) sends ticks, and only a fitted,
      // online crack monitor records a reading. Otherwise the state is returned unchanged so
      // nothing is written and other tabs' changes are never overwritten.
      const d = s.devices['crack-w3'];
      const now = Date.now();
      if (!d.installed || !d.online || !s.devices.hub.online) return s;
      const last = d.readings[d.readings.length - 1];
      if (last && now - last.at < 1800) return s;
      const mm = Math.max(0, +(s.sim.crackMm - d.base).toFixed(2));
      const readings = [...d.readings, { at: now, mm }].slice(-90);
      // Guided demo: readings are recorded, but the anomaly is raised by its own step
      if (s.demo && s.demo.step > 0) return setDevice(s, 'crack-w3', { readings, lastSeen: now });
      const over = d.limit != null && mm > d.limit;
      let n = setDevice(s, 'crack-w3', { readings, lastSeen: now, over });
      if (over && !d.over) {
        n = logEvent(n, 'crack-w3', `Movement ${mm.toFixed(2)} mm passed the ${d.limit} mm limit`, 'bad');
        if (d.alerts) n = notify(n, { title: 'Crack movement above limit', body: `The crack monitor at window W3 recorded ${mm.toFixed(2)} mm, above the ${d.limit} mm limit set by your technician. They have been told.`, kind: 'alert', link: 'devices/crack-w3', pref: 'device' });
        if (d.woId) n = setWo(n, d.woId, (w) => ({ ...w, priority: w.priority === 'urgent' ? 'urgent' : 'high', timeline: line(w, `Crack monitor passed the ${d.limit} mm limit; priority raised to high`) }));
      }
      if (!over && d.over) n = logEvent(n, 'crack-w3', 'Movement back under the limit', 'ok');
      return n;
    }

    // ---------- resident ----------
    case 'device/alerts': {
      return logEvent(setDevice(s, a.id, { alerts: a.on }), a.id, a.on ? 'Alerts turned on by resident' : 'Alerts turned off by resident');
    }
    case 'device/ack':
      return logEvent(setDevice(s, a.id, { ack: true }), a.id, 'Alert acknowledged by resident');
    case 'device/test': {
      const d = s.devices[a.id];
      const ok = d.online && s.devices.hub.online;
      let n = setDevice(s, a.id, ok ? { lastTest: Date.now(), lastSeen: Date.now() } : { lastTest: Date.now() });
      n = logEvent(n, a.id, ok ? 'Test passed: sensor responded' : 'Test failed: no response', ok ? 'ok' : 'warn');
      return n;
    }
    case 'notif/read':
      return { ...s, notifications: s.notifications.map((x) => (a.id === 'all' || x.id === a.id ? { ...x, read: true } : x)) };
    case 'prefs':
      return { ...s, prefs: { ...s.prefs, ...a.prefs } };
    case 'wo/create': {
      const id = 'WO-' + s.nextWo;
      const now = Date.now();
      const w = {
        id, home: DEMO_HOME, status: 'new', assignee: null, appointment: null, notes: [], findings: [], completion: null,
        followUp: null, aiAgree: null, firstResponse: null, created: now, updated: now, sample: false, ...a.wo,
        timeline: [{ at: now, text: a.wo.source === 'leak_sensor' ? 'Request sent by resident after a leak sensor alert' : 'Request sent by resident' }],
      };
      let n = { ...s, workOrders: [w, ...s.workOrders], nextWo: s.nextWo + 1, lastCreated: id };
      if (a.wo.deviceId) n = setDevice(n, a.wo.deviceId, { ack: true });
      return n;
    }
    case 'wo/cancel': {
      let n = setWo(s, a.id, (w) => ({ ...w, status: 'cancelled', timeline: line(w, 'Cancelled by resident' + (a.reason ? ': ' + a.reason : '')) }));
      return n;
    }

    // ---------- technician ----------
    case 'wo/assign': {
      const w0 = s.workOrders.find((w) => w.id === a.id);
      let n = setWo(s, a.id, (w) => ({ ...w, assignee: a.tech, status: w.status === 'new' ? 'assigned' : w.status, firstResponse: w.firstResponse || Date.now(), timeline: line(w, 'Assigned to ' + techName(a.tech)) }));
      return residentUpdate(n, w0, 'Technician assigned', `${techName(a.tech)} will handle your request.`);
    }
    case 'wo/schedule': {
      const w0 = s.workOrders.find((w) => w.id === a.id);
      const when = new Date(a.at).toLocaleString('en-MY', { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
      let n = setWo(s, a.id, (w) => ({ ...w, appointment: a.at, status: ['new', 'assigned', 'scheduled'].includes(w.status) ? 'scheduled' : w.status, firstResponse: w.firstResponse || Date.now(), timeline: line(w, (w.appointment ? 'Visit rescheduled to ' : 'Visit scheduled for ') + when) }));
      return residentUpdate(n, w0, w0.appointment ? 'Visit rescheduled' : 'Visit scheduled', `${techName(w0.assignee)} will visit on ${when}.`);
    }
    case 'wo/start': {
      const w0 = s.workOrders.find((w) => w.id === a.id);
      const n = setWo(s, a.id, (w) => ({ ...w, status: 'in_progress', followUp: null, timeline: line(w, w.status === 'follow_up' ? 'Work resumed' : 'Work started') }));
      return residentUpdate(n, w0, 'Work started', `${techName(w0.assignee)} has started work.`);
    }
    case 'wo/priority':
      return setWo(s, a.id, (w) => ({ ...w, priority: a.priority, timeline: line(w, 'Priority set to ' + a.priority) }));
    case 'wo/note':
      return setWo(s, a.id, (w) => ({ ...w, notes: [...w.notes, { at: Date.now(), by: a.by, kind: a.kind, text: a.text }], timeline: line(w, a.kind === 'action' ? 'Action recorded' : 'Inspection note added') }));
    case 'wo/aiAgree':
      return setWo(s, a.id, (w) => ({ ...w, aiAgree: a.value, timeline: line(w, 'Technician checked the AI label: ' + a.value.toLowerCase()) }));
    case 'wo/followUp': {
      const w0 = s.workOrders.find((w) => w.id === a.id);
      const n = setWo(s, a.id, (w) => ({ ...w, status: 'follow_up', followUp: { reason: a.reason, text: a.text }, timeline: line(w, 'Follow-up needed: ' + a.text) }));
      return residentUpdate(n, w0, 'Follow-up needed', a.text);
    }
    case 'wo/fitMonitor': {
      const w0 = s.workOrders.find((w) => w.id === a.id);
      let n = setDevice(s, 'crack-w3', { installed: true, limit: a.limit, base: s.sim.crackMm, readings: [{ at: Date.now(), mm: 0 }], over: false, woId: a.id, online: true, installedAt: Date.now() });
      n = logEvent(n, 'crack-w3', `Crack monitor fitted by ${techName(w0.assignee)}, alert limit ${a.limit} mm`, 'ok');
      n = setWo(n, a.id, (w) => ({ ...w, deviceId: 'crack-w3', status: 'follow_up', followUp: { reason: 'monitoring', text: `Crack monitor fitted at window W3. Alert limit ${a.limit} mm of movement.` }, timeline: line(w, `Crack monitor fitted, alert limit ${a.limit} mm`) }));
      return residentUpdate(n, w0, 'Crack monitor fitted', `A crack monitor is now measuring movement at window W3. You'll be told if it passes ${a.limit} mm.`);
    }
    case 'wo/complete': {
      const w0 = s.workOrders.find((w) => w.id === a.id);
      let n = setWo(s, a.id, (w) => ({ ...w, status: 'completed', followUp: null, completion: { at: Date.now(), by: w.assignee, summary: a.summary }, timeline: line(w, 'Completed') }));
      if (a.removeMonitor) {
        n = setDevice(n, 'crack-w3', { installed: false, limit: null, readings: [], over: false, woId: null });
        n = logEvent(n, 'crack-w3', 'Crack monitor removed', 'ok');
      }
      return residentUpdate(n, w0, 'Maintenance completed', `${techName(w0.assignee)} completed the work. ${a.summary}`);
    }
    case 'wo/decline': {
      const w0 = s.workOrders.find((w) => w.id === a.id);
      const n = setWo(s, a.id, (w) => ({ ...w, status: 'declined', completion: { at: Date.now(), by: a.by, summary: a.reason }, timeline: line(w, 'Declined: ' + a.reason) }));
      return residentUpdate(n, w0, 'Request declined', a.reason);
    }
    case 'inspection/save': {
      const id = 'INS-0' + s.nextIns;
      let n = { ...s, inspections: [{ id, at: Date.now(), ...a.record }, ...s.inspections], nextIns: s.nextIns + 1 };
      if (a.record.woId) n = setWo(n, a.record.woId, (w) => ({ ...w, findings: [...w.findings, ...a.record.items], timeline: line(w, `Inspection ${id} recorded`) }));
      return n;
    }

    // ---------- guided live demo (deterministic, step by step) ----------
    case 'demo/start': {
      let n = preHandoverState();
      n = logEvent(n, 'hub', `Pre-handover baseline inspection started by ${INSPECTOR}`, 'info');
      return { ...n, demo: { step: 1, startedAt: Date.now() } };
    }
    case 'demo/baseline': {
      if (s.demo.step !== 1) return s;
      const id = 'INS-0' + s.nextIns;
      const now = Date.now();
      const rec = {
        id, home: DEMO_HOME, type: 'handover', at: now, by: INSPECTOR, live: true,
        items: [
          { area: 'Kitchen plumbing', result: 'ok', note: 'No leaks seen. Leak sensor under the sink tested: dry, responding.', deviceId: 'leak-kitchen', reading: 'Dry' },
          { area: 'Bathroom plumbing', result: 'ok', note: 'No leaks seen. Leak sensor at the basin tested: dry, responding.', deviceId: 'leak-basin', reading: 'Dry' },
          { area: 'Laundry area', result: 'ok', note: 'No leaks seen. Leak sensor tested: dry, responding.', deviceId: 'leak-laundry', reading: 'Dry' },
          { area: 'Side wall, window W3', result: 'potential', note: 'Fine surface crack at the lower window corner, about 120 mm long, photographed. Crack monitor fitted across it. Baseline reading 0.00 mm; alert limit 0.40 mm of movement.', deviceId: 'crack-w3', reading: '0.00 mm' },
          { area: 'Living room walls and ceilings', result: 'ok', note: 'No other visible cracks, staining or damp.' },
          { area: 'SIAGA hub', result: 'ok', note: 'Powered, on Wi-Fi, all four sensors paired.', deviceId: 'hub' },
        ],
      };
      let n = { ...s, inspections: [rec, ...s.inspections], nextIns: s.nextIns + 1, handover: { at: now, inspectionId: id } };
      n = setDevice(n, 'crack-w3', { installed: true, limit: 0.4, base: s.sim.crackMm, readings: [{ at: now, mm: 0 }], over: false, woId: null, online: true, installedAt: now, baselineId: id, anomaly: null });
      ['leak-kitchen', 'leak-basin', 'leak-laundry'].forEach((d) => { n = setDevice(n, d, { lastTest: now, lastSeen: now }); });
      n = logEvent(n, 'crack-w3', 'Crack monitor fitted at handover. Baseline 0.00 mm, limit 0.40 mm', 'ok');
      n = logEvent(n, 'hub', `Baseline recorded (${id}). Handover inspection complete`, 'ok');
      n = notify(n, { title: 'Handover inspection recorded', body: `Your home was inspected before handover (${id}). The baseline readings are saved. One item noted: a fine crack at window W3, now monitored. This record is not a safety certificate.`, kind: 'info', link: 'profile/inspection' });
      return { ...n, demo: { ...s.demo, step: 2, baselineId: id } };
    }
    case 'demo/defect':
      if (s.demo.step !== 2) return s;
      return logEvent({ ...s, demo: { ...s.demo, step: 3 } }, 'crack-w3', 'Months after handover (simulated): wall movement starting at W3', 'warn');
    case 'demo/anomaly': {
      if (s.demo.step !== 3) return s;
      const d = s.devices['crack-w3'];
      const now = Date.now();
      const mm = Math.max(0, +(s.sim.crackMm - d.base).toFixed(2));
      const anomaly = { at: now, baselineMm: 0, currentMm: mm, limit: d.limit, baselineId: d.baselineId };
      let n = setDevice(s, 'crack-w3', { readings: [...d.readings, { at: now, mm }].slice(-90), over: mm > d.limit, anomaly, lastSeen: now });
      n = logEvent(n, 'crack-w3', `Anomaly: ${mm.toFixed(2)} mm against a 0.00 mm baseline (limit ${d.limit} mm)`, 'bad');
      return { ...n, demo: { ...s.demo, step: 4 } };
    }
    case 'demo/alert': {
      if (s.demo.step !== 4) return s;
      const a0 = s.devices['crack-w3'].anomaly;
      let n = notify(s, { title: 'Potential crack movement: inspection required', body: `The crack monitor at window W3 (living room) reads ${a0.currentMm.toFixed(2)} mm against its 0.00 mm handover baseline, above the ${a0.limit} mm limit. SIAGA cannot tell whether this is serious. A technician should inspect it.`, kind: 'alert', link: 'devices/crack-w3' });
      n = logEvent(n, 'crack-w3', 'Resident alerted', 'warn');
      return { ...n, demo: { ...s.demo, step: 5 } };
    }
    case 'demo/workorder': {
      if (s.demo.step !== 5) return s;
      const d = s.devices['crack-w3'];
      const id = 'WO-' + s.nextWo;
      const now = Date.now();
      const w = {
        id, home: DEMO_HOME, category: 'crack', title: 'Potential crack movement at window W3', room: 'living', location: 'Side wall, lower corner of window W3',
        description: `Crack monitor reading ${d.anomaly.currentMm.toFixed(2)} mm against the 0.00 mm baseline recorded at handover (${d.baselineId}). Limit ${d.limit} mm.`,
        priority: 'high', status: 'new', source: 'crack_monitor', deviceId: 'crack-w3', shareReadings: true, evidence: d.anomaly,
        photo: null, boxes: [], ai: null, signs: [], prefTime: '', assignee: null, appointment: null, notes: [], findings: [], completion: null,
        followUp: null, aiAgree: null, firstResponse: null, created: now, updated: now, sample: false,
        timeline: [{ at: now, text: 'Created from a crack monitor anomaly; resident alerted' }],
      };
      let n = { ...s, workOrders: [w, ...s.workOrders], nextWo: s.nextWo + 1, lastCreated: id };
      n = setDevice(n, 'crack-w3', { woId: id });
      n = notify(n, { title: 'Inspection request created', body: `${id}: a technician will inspect the crack at window W3. The baseline and current readings are attached.`, kind: 'update', link: 'maintenance/' + id, pref: 'maintenance' });
      return { ...n, demo: { ...s.demo, step: 6, woId: id } };
    }
    case 'demo/inspect': {
      if (s.demo.step !== 6) return s;
      const id = s.demo.woId;
      const insId = 'INS-0' + s.nextIns;
      const now = Date.now();
      const d = s.devices['crack-w3'];
      const finding = { area: 'Side wall, window W3', result: 'confirmed', note: `Sample finding: crack has lengthened from the handover photo; monitor reads ${d.anomaly.currentMm.toFixed(2)} mm above baseline. Referred to a structural engineer for assessment before repair.` };
      let n = setWo(s, id, (w) => ({ ...w, assignee: ME, firstResponse: now, appointment: now, status: 'in_progress', findings: [...w.findings, finding],
        timeline: [...line(w, `Assigned to ${techName(ME)}`), { at: now, text: 'Visit booked and work started' }, { at: now, text: `Inspection ${insId} recorded: movement confirmed on site` }] }));
      n = { ...n, inspections: [{ id: insId, home: DEMO_HOME, type: 'device', at: now, by: techName(ME), woId: id, items: [finding] }, ...n.inspections], nextIns: n.nextIns + 1 };
      n = notify(n, { title: 'Inspection completed', body: `${id}: ${techName(ME)} inspected the crack at window W3 and confirmed it has moved since handover. Next: an engineer's assessment, then repair.`, kind: 'update', link: 'maintenance/' + id, pref: 'maintenance' });
      return { ...n, demo: { ...s.demo, step: 7, inspectionId: insId } };
    }
    case 'demo/resolve': {
      if (s.demo.step !== 7) return s;
      const id = s.demo.woId;
      const now = Date.now();
      const summary = 'Sample: repaired as specified in the engineer\'s assessment. Monitor kept in place with a new 0.00 mm baseline for 3 months of follow-up.';
      let n = setWo(s, id, (w) => ({ ...w, status: 'completed', completion: { at: now, by: ME, summary }, timeline: line(w, 'Completed') }));
      n = { ...n, sim: { ...n.sim, crackMm: 0 } };
      n = setDevice(n, 'crack-w3', { base: 0, readings: [{ at: now, mm: 0 }], over: false, anomaly: null });
      n = logEvent(n, 'crack-w3', 'Repair completed. New baseline 0.00 mm', 'ok');
      n = notify(n, { title: 'Maintenance completed', body: `${id}: ${summary}`, kind: 'update', link: 'maintenance/' + id, pref: 'maintenance' });
      return { ...n, demo: { ...s.demo, step: 8 } };
    }
    case 'reset':
      return seedState();
    default:
      return s;
  }
}

const Ctx = createContext(null);

export function StoreProvider({ children, ticks = false }) {
  const [state, dispatch] = useReducer(reducer, undefined, load);
  const fromOtherTab = useRef(false);

  useEffect(() => {
    if (fromOtherTab.current) { fromOtherTab.current = false; return; }
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* storage full or blocked: demo keeps working in memory */ }
  }, [state]);

  useEffect(() => {
    const onStorage = (e) => {
      if (e.key !== KEY || !e.newValue) return;
      try { const s = JSON.parse(e.newValue); if (s && s.v === 5) { fromOtherTab.current = true; dispatch({ type: 'hydrate', state: s }); } } catch (err) { /* ignore */ }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  useEffect(() => {
    if (!ticks) return undefined;
    const t = setInterval(() => { if (window.location.hash.startsWith('#/house')) dispatch({ type: 'tick' }); }, 2000);
    return () => clearInterval(t);
  }, [ticks]);

  return <Ctx.Provider value={{ state, dispatch }}>{children}</Ctx.Provider>;
}

export const useStore = () => useContext(Ctx);

// Derived helpers shared by both apps
export function deviceState(d, hubOnline = true) {
  if (d.kind === 'crack' && !d.installed) return { key: 'unavailable', text: 'Not installed', tone: 'off' };
  if (!d.online || (d.kind !== 'hub' && !hubOnline)) return { key: 'offline', text: 'Offline', tone: 'off' };
  if (d.kind === 'leak' && d.wet) return { key: 'alert', text: 'Water detected', tone: 'bad' };
  if (d.kind === 'crack' && d.over) return { key: 'alert', text: 'Above limit', tone: 'bad' };
  if (d.kind !== 'hub' && !d.alerts) return { key: 'inactive', text: 'Alerts off', tone: 'off' };
  if (d.kind === 'leak') return { key: 'active', text: 'Dry', tone: 'ok' };
  if (d.kind === 'crack') return { key: 'active', text: 'Monitoring', tone: 'ok' };
  return { key: 'active', text: 'Online', tone: 'ok' };
}
export const lastReading = (d) => (d.readings && d.readings.length ? d.readings[d.readings.length - 1].mm : null);
export { STATUS, catName };
