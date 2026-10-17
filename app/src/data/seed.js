// Demo data. The township, homes, people and the other homes' cases are SAMPLE data for the prototype.

export const DEMO_HOME = 'H12';

export const HOMES = Array.from({ length: 24 }, (_, i) => {
  const n = i + 1;
  return { id: 'H' + String(n).padStart(2, '0'), label: 'No. ' + n, street: n <= 12 ? 'Jalan Siaga 3' : 'Jalan Siaga 5' };
});

export const LEAK_SENSORS = [
  { id: 'kitchen', name: 'Under kitchen sink' },
  { id: 'basin', name: 'Bathroom basin plumbing' },
  { id: 'laundry', name: 'Laundry area' },
];

export const BASELINE = {
  home: 'H12',
  date: '2026-09-02',
  inspector: 'Nurul Aina (sample inspector)',
  items: [
    { area: 'Living room walls', result: 'No visible cracks', ok: true },
    { area: 'Kitchen plumbing', result: 'No leaks; leak sensor fitted under sink and tested', ok: true },
    { area: 'Bathroom 1', result: 'No leaks; leak sensor fitted at basin and tested', ok: true },
    { area: 'Laundry area', result: 'No leaks; leak sensor fitted and tested', ok: true },
    { area: 'Side wall, window W3', result: 'Fine surface crack at the lower window corner, 120 mm long. Photographed and recorded.', ok: false },
    { area: 'Ceilings', result: 'No staining or damp seen', ok: true },
  ],
};

const day = 86400000;
export function seedState(now = Date.now()) {
  const t = (d) => now - d * day;
  return {
    v: 3,
    leaks: { kitchen: false, basin: false, laundry: false },
    alerts: [],
    crackMm: 0,
    reports: [
      { id: 'R-0098', home: 'H04', sample: true, type: 'crack', title: 'Vertical crack, living room', ai: { label: 'Vertical', conf: 0.81, source: 'sample' },
        status: 'monitor', limitMm: 0.5, created: t(21), decided: t(19), readings: [], timeline: [] },
      { id: 'R-0101', home: 'H09', sample: true, type: 'leak', title: 'Leak under kitchen sink', status: 'closed', created: t(12), decided: t(12) + 3 * 3600000, timeline: [] },
      { id: 'R-0103', home: 'H17', sample: true, type: 'crack', title: 'Hairline crack, bedroom', ai: { label: 'Hairline', conf: 0.66, source: 'sample' },
        status: 'no_action', created: t(9), decided: t(7), timeline: [] },
      { id: 'R-0104', home: 'H21', sample: true, type: 'crack', title: 'Diagonal crack at door corner', ai: { label: 'Diagonal', conf: 0.74, source: 'sample' },
        status: 'inspect', created: t(4), decided: t(3), timeline: [] },
      { id: 'R-0106', home: 'H06', sample: true, type: 'leak', title: 'Leak at bathroom basin', status: 'submitted', created: t(1), timeline: [] },
    ],
    nextId: 107,
    sampleAlerts: [{ home: 'H09' }, { home: 'H06' }, { home: 'H15' }],
  };
}

export const STATUS = {
  submitted: { text: 'Waiting for review', tone: 'warn' },
  inspect: { text: 'Inspection booked', tone: 'info' },
  urgent: { text: 'Urgent assessment', tone: 'bad' },
  repair: { text: 'Repair scheduled', tone: 'info' },
  monitor: { text: 'Under monitoring', tone: 'info' },
  no_action: { text: 'Reviewed: no action needed', tone: 'ok' },
  declined: { text: 'Declined (duplicate or invalid)', tone: 'muted' },
  closed: { text: 'Repaired and closed', tone: 'ok' },
};
