// Demonstration data shared by the house prototype and the application.
// Everything here is SAMPLE data: the township, homes, people and other homes' jobs are invented for the demo.

export const DEMO_HOME = 'H12';

export const HOMES = Array.from({ length: 24 }, (_, i) => {
  const n = i + 1;
  return { id: 'H' + String(n).padStart(2, '0'), no: n, street: n <= 12 ? 'Jalan Siaga 3' : 'Jalan Siaga 5' };
});
export const homeAddress = (id) => {
  const h = HOMES.find((x) => x.id === id);
  return h ? `No. ${h.no}, ${h.street}` : id;
};

export const RESIDENT = {
  name: 'Farah Hanim',
  first: 'Farah',
  phone: '012-345 6789',
  home: DEMO_HOME,
  township: 'Demo Township, Phase 2',
  handover: '2026-09-05',
  type: 'Two-storey terrace',
};

export const TECHNICIANS = [
  { id: 'T1', name: 'Hafiz Idris', short: 'Hafiz I.' },
  { id: 'T2', name: 'Kumar Selvam', short: 'Kumar S.' },
  { id: 'T3', name: 'Tan Wei Ling', short: 'Tan W. L.' },
];
export const ME = 'T1'; // the technician using the technician app in this demo
export const techName = (id) => (TECHNICIANS.find((t) => t.id === id) || {}).name || 'Unassigned';

// Rooms of the demo home. Coordinates are in plan units and match the 3D model.
export const FLOORS = [
  { id: 'ground', name: 'Ground floor' },
  { id: 'first', name: 'First floor' },
];
export const ROOMS = [
  { id: 'living', floor: 'ground', name: 'Living and dining', x: 0, y: 6.8, w: 16, h: 9.2 },
  { id: 'kitchen', floor: 'ground', name: 'Kitchen', x: 16, y: 7.3, w: 8, h: 8.7 },
  { id: 'bath', floor: 'ground', name: 'Bathroom', x: 16, y: 0, w: 8, h: 7.3 },
  { id: 'laundry', floor: 'ground', name: 'Laundry', x: 0, y: 0, w: 7.5, h: 6.8 },
  { id: 'hall', floor: 'ground', name: 'Stairs and hall', x: 7.5, y: 0, w: 8.5, h: 6.8 },
  { id: 'bed1', floor: 'first', name: 'Main bedroom', x: 0, y: 7, w: 13, h: 9 },
  { id: 'bed2', floor: 'first', name: 'Bedroom 2', x: 13, y: 7, w: 11, h: 9 },
  { id: 'bath2', floor: 'first', name: 'Bathroom 2', x: 16, y: 0, w: 8, h: 7 },
  { id: 'landing', floor: 'first', name: 'Landing', x: 0, y: 0, w: 16, h: 7 },
];
export const roomName = (id) => (ROOMS.find((r) => r.id === id) || {}).name || '—';

export const CATEGORIES = [
  { id: 'crack', name: 'Wall crack', hint: 'Includes an AI check of the crack pattern from your photo' },
  { id: 'leak', name: 'Water leak', hint: 'Dripping pipes, water on the floor, damp patches' },
  { id: 'plumbing', name: 'Plumbing', hint: 'Taps, drains, water pressure, toilets' },
  { id: 'doors', name: 'Doors and windows', hint: 'Sticking, misaligned or damaged frames, locks' },
  { id: 'electrical', name: 'Electrical', hint: 'Sockets, switches, lights. For sparks or burning smells, switch off at the DB box first.' },
  { id: 'other', name: 'Something else', hint: 'Anything not listed' },
];
export const catName = (id) => (CATEGORIES.find((c) => c.id === id) || {}).name || id;

// Work order statuses, in workflow order
export const STATUS = {
  new: { text: 'New', tone: 'brand', step: 0 },
  assigned: { text: 'Assigned', tone: 'brand', step: 1 },
  scheduled: { text: 'Visit scheduled', tone: 'brand', step: 2 },
  in_progress: { text: 'In progress', tone: 'warn', step: 3 },
  follow_up: { text: 'Follow-up', tone: 'warn', step: 3 },
  completed: { text: 'Completed', tone: 'ok', step: 4 },
  declined: { text: 'Declined', tone: 'off', step: -1 },
  cancelled: { text: 'Cancelled', tone: 'off', step: -1 },
};
export const OPEN_STATUSES = ['new', 'assigned', 'scheduled', 'in_progress', 'follow_up'];
export const STEPS = ['Sent', 'Assigned', 'Visit booked', 'Work under way', 'Completed'];

export const PRIORITY = {
  urgent: { text: 'Urgent', tone: 'bad', rank: 0 },
  high: { text: 'High', tone: 'warn', rank: 1 },
  normal: { text: 'Normal', tone: 'off', rank: 2 },
  low: { text: 'Low', tone: 'off', rank: 3 },
};

export const BASELINE = {
  id: 'INS-0201',
  home: DEMO_HOME,
  type: 'handover',
  at: Date.parse('2026-09-02T10:00:00+08:00'),
  by: 'Nurul Aina, building inspector (sample)',
  items: [
    { area: 'Living room walls', result: 'ok', note: 'No visible cracks' },
    { area: 'Kitchen plumbing', result: 'ok', note: 'No leaks. Leak sensor fitted under sink and tested.' },
    { area: 'Bathroom plumbing', result: 'ok', note: 'No leaks. Leak sensor fitted at basin and tested.' },
    { area: 'Laundry area', result: 'ok', note: 'No leaks. Leak sensor fitted and tested.' },
    { area: 'Side wall, window W3', result: 'potential', note: 'Fine surface crack at the lower window corner, about 120 mm long. Photographed and recorded as a baseline.' },
    { area: 'Ceilings', result: 'ok', note: 'No staining or damp seen' },
  ],
};

const H = 3600000, D = 24 * H;

function at(now, daysAgo, hour, min = 0) {
  const d = new Date(now - daysAgo * D);
  d.setHours(hour, min, 0, 0);
  return d.getTime();
}

function wo(o) {
  return {
    room: null, location: '', photo: null, boxes: [], ai: null, signs: [], prefTime: '', deviceId: null,
    assignee: null, appointment: null, notes: [], findings: [], completion: null, followUp: null, aiAgree: null,
    firstResponse: null, source: 'resident', shareReadings: false, sample: true, ...o,
    updated: o.updated || o.created,
  };
}

export function seedState(now = Date.now()) {
  return {
    v: 5,
    demo: { step: 0 },
    handover: { at: BASELINE.at, inspectionId: BASELINE.id },
    devices: {
      'leak-kitchen': { power: 'wired', id: 'leak-kitchen', kind: 'leak', name: 'Leak sensor', spot: 'Under kitchen sink', room: 'kitchen', wet: false, online: true, alerts: true, battery: 94, lastSeen: now, ack: false },
      'leak-basin': { power: 'battery', id: 'leak-basin', kind: 'leak', name: 'Leak sensor', spot: 'Bathroom basin plumbing', room: 'bath', wet: false, online: true, alerts: true, battery: 91, lastSeen: now, ack: false },
      'leak-laundry': { power: 'wired', id: 'leak-laundry', kind: 'leak', name: 'Leak sensor', spot: 'Laundry, behind washer', room: 'laundry', wet: false, online: true, alerts: true, battery: 88, lastSeen: now, ack: false },
      'crack-w3': { power: 'battery', id: 'crack-w3', kind: 'crack', name: 'Crack monitor', spot: 'Side wall, window W3', room: 'living', installed: false, online: true, alerts: true, limit: null, base: 0, readings: [], over: false, woId: null, lastSeen: now },
      hub: { power: 'wired', id: 'hub', kind: 'hub', name: 'SIAGA hub', spot: 'Hall, next to the DB box', room: 'hall', online: true, lastSeen: now },
    },
    sim: { crackMm: 0 },
    events: [
      { id: 'E1', at: BASELINE.at, deviceId: 'hub', text: 'Hub set up and the three leak sensors paired during handover inspection' },
    ],
    workOrders: [
      wo({ id: 'WO-1039', home: DEMO_HOME, category: 'electrical', title: 'Loose power socket in main bedroom', room: 'bed1',
        description: 'The double socket beside the bed moves when I plug something in.', priority: 'normal', status: 'completed', assignee: 'T2',
        created: at(now, 24, 9, 20), firstResponse: at(now, 24, 11), appointment: at(now, 22, 10),
        completion: { at: at(now, 22, 11, 5), by: 'T2', summary: 'Socket faceplate screws had worked loose. Tightened and tested the socket. No damage to the wiring.' },
        timeline: [
          { at: at(now, 24, 9, 20), text: 'Request sent by resident' },
          { at: at(now, 24, 11), text: 'Assigned to Kumar Selvam' },
          { at: at(now, 24, 11, 10), text: 'Visit scheduled' },
          { at: at(now, 22, 10, 5), text: 'Work started' },
          { at: at(now, 22, 11, 5), text: 'Completed' },
        ] }),
      wo({ id: 'WO-1041', home: 'H04', category: 'crack', title: 'Vertical crack, living room wall', room: 'living', description: 'Crack from ceiling to the top of the TV cabinet.',
        ai: { label: 'Vertical', conf: 0.81, source: 'sample' }, priority: 'normal', status: 'follow_up', assignee: 'T2',
        followUp: { reason: 'monitoring', text: 'Crack monitor fitted, alert limit 0.5 mm. Reassess in 4 weeks.' },
        created: at(now, 21, 15), firstResponse: at(now, 20, 9), appointment: at(now, 19, 10),
        timeline: [{ at: at(now, 21, 15), text: 'Request sent by resident' }, { at: at(now, 19, 11), text: 'Crack monitor fitted. Follow-up: monitoring' }] }),
      wo({ id: 'WO-1043', home: 'H09', category: 'leak', title: 'Water under kitchen sink', room: 'kitchen', source: 'leak_sensor',
        description: 'Leak sensor alert. There is water in the cabinet under the sink.', priority: 'high', status: 'completed', assignee: 'T1',
        created: at(now, 12, 8, 40), firstResponse: at(now, 12, 9, 5), appointment: at(now, 12, 14),
        completion: { at: at(now, 12, 15, 10), by: 'T1', summary: 'Sink waste pipe seal had perished. Replaced the seal, ran water for 10 minutes, no further leak. Cabinet base dried.' },
        timeline: [{ at: at(now, 12, 8, 40), text: 'Request sent by resident after a leak sensor alert' }, { at: at(now, 12, 15, 10), text: 'Completed' }] }),
      wo({ id: 'WO-1045', home: 'H17', category: 'crack', title: 'Fine crack above bedroom door', room: 'bed2',
        ai: { label: 'Hairline', conf: 0.66, source: 'sample' }, description: 'Thin crack in the paint above the door frame.', priority: 'normal', status: 'completed', assignee: 'T3',
        created: at(now, 9, 20), firstResponse: at(now, 8, 10), appointment: at(now, 7, 11),
        completion: { at: at(now, 7, 11, 40), by: 'T3', summary: 'Surface crack in the skim coat only, about 0.1 mm. No repair needed now. Resident advised to re-photograph in 4 weeks and report any change.' },
        timeline: [{ at: at(now, 9, 20), text: 'Request sent by resident' }, { at: at(now, 7, 11, 40), text: 'Completed' }] }),
      wo({ id: 'WO-1046', home: 'H21', category: 'crack', title: 'Diagonal crack at back door corner', room: 'kitchen',
        ai: { label: 'Diagonal', conf: 0.74, source: 'sample' }, description: 'Started at the top corner of the back door. The door now rubs when closing.',
        signs: ['A door or window near it has started sticking'], priority: 'high', status: 'scheduled', assignee: 'T1',
        created: at(now, 4, 18), firstResponse: at(now, 3, 9), appointment: at(now, 1, 10),
        timeline: [{ at: at(now, 4, 18), text: 'Request sent by resident' }, { at: at(now, 3, 9), text: 'Assigned to Hafiz Idris' }, { at: at(now, 3, 9, 5), text: 'Visit scheduled' }] }),
      wo({ id: 'WO-1047', home: 'H06', category: 'leak', title: 'Water at bathroom basin', room: 'bath', source: 'leak_sensor',
        description: 'Sensor went off this morning. Small puddle under the basin, looks like it comes from the pipe joint.', priority: 'high', status: 'new',
        created: at(now, 0, 7, 50), timeline: [{ at: at(now, 0, 7, 50), text: 'Request sent by resident after a leak sensor alert' }] }),
      wo({ id: 'WO-1048', home: 'H15', category: 'doors', title: 'Sliding door hard to close', room: 'living', description: 'The patio sliding door sticks halfway. Started after the rain last week.',
        priority: 'normal', status: 'assigned', assignee: 'T1', created: at(now, 2, 13), firstResponse: at(now, 1, 16),
        timeline: [{ at: at(now, 2, 13), text: 'Request sent by resident' }, { at: at(now, 1, 16), text: 'Assigned to Hafiz Idris' }] }),
      wo({ id: 'WO-1049', home: 'H02', category: 'plumbing', title: 'Low water pressure upstairs', room: 'bath2', description: 'Shower upstairs is very weak in the evening.',
        priority: 'low', status: 'scheduled', assignee: 'T1', created: at(now, 3, 21), firstResponse: at(now, 2, 9), appointment: at(now, -1, 14, 30),
        timeline: [{ at: at(now, 3, 21), text: 'Request sent by resident' }, { at: at(now, 2, 9), text: 'Visit scheduled' }] }),
    ],
    notifications: [
      { id: 'N2', at: at(now, 22, 11, 5), title: 'Maintenance completed', body: 'WO-1039, loose power socket: Kumar Selvam completed the work.', kind: 'update', read: true, link: 'maintenance/WO-1039' },
      { id: 'N1', at: BASELINE.at + 3 * H, title: 'Handover inspection record available', body: 'Your home was inspected on 2 September 2026. One item was recorded: a fine crack at window W3.', kind: 'info', read: true, link: 'profile/inspection' },
    ],
    inspections: [
      BASELINE,
      { id: 'INS-0214', home: 'H04', type: 'device', at: at(now, 19, 10, 30), by: 'Kumar Selvam', woId: 'WO-1041',
        items: [{ area: 'Living room wall', result: 'confirmed', note: 'Vertical crack about 0.3 mm at the widest point. Crack monitor fitted for 4 weeks.' }] },
    ],
    prefs: { leakAlerts: true, maintenance: true, device: true },
    nextWo: 1050,
    nextIns: 215,
    lastTick: 0,
  };
}

// Guided live demo: the same home on the day of its pre-handover inspection.
// No handover record yet, no crack monitor, and only the other homes' sample jobs.
export function preHandoverState(now = Date.now()) {
  const s = seedState(now);
  return {
    ...s,
    handover: null,
    inspections: s.inspections.filter((i) => i.home !== DEMO_HOME),
    workOrders: s.workOrders.filter((w) => w.home !== DEMO_HOME),
    notifications: [],
    events: [],
  };
}
