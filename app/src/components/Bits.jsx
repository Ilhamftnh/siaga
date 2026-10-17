import { STATUS } from '../data/seed.js';

export function Pill({ status }) {
  const s = STATUS[status] || { text: status, tone: 'muted' };
  return <span className={'pill ' + s.tone}>{s.text}</span>;
}

export function Tag({ children, tone = 'muted' }) {
  return <span className={'tag ' + tone}>{children}</span>;
}

// Crack movement chart: relative displacement against time, with the professional's alert limit.
export function MoveChart({ readings = [], limit }) {
  const W = 320, H = 150, L = 34, R = 10, T = 12, B = 22;
  const pts = readings.slice(-60);
  const max = Math.max(limit ? limit * 1.4 : 1, ...pts.map((p) => p.mm), 0.2);
  const x = (i) => L + (pts.length < 2 ? 0 : (i / (pts.length - 1)) * (W - L - R));
  const y = (v) => T + (1 - v / max) * (H - T - B);
  const ticks = [0, max / 2, max];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Crack movement over time">
      {ticks.map((v, i) => (
        <g key={i}>
          <line x1={L} x2={W - R} y1={y(v)} y2={y(v)} stroke="var(--line)" />
          <text x={L - 6} y={y(v) + 4} textAnchor="end" className="axis">{v.toFixed(2)}</text>
        </g>
      ))}
      {limit != null && (
        <g>
          <line x1={L} x2={W - R} y1={y(limit)} y2={y(limit)} stroke="var(--bad)" strokeDasharray="5 4" />
          <text x={W - R} y={y(limit) - 5} textAnchor="end" className="axis" fill="var(--bad)">alert limit {limit} mm</text>
        </g>
      )}
      {pts.length > 1 && (
        <polyline fill="none" stroke="var(--teal)" strokeWidth="2.5"
          points={pts.map((p, i) => x(i) + ',' + y(p.mm)).join(' ')} />
      )}
      {pts.length > 0 && <circle cx={x(pts.length - 1)} cy={y(pts[pts.length - 1].mm)} r="4" fill="var(--teal)" />}
      <text x={L} y={H - 5} className="axis">mm movement since sensor fitted</text>
    </svg>
  );
}

// Photo with AI boxes drawn on top
export function AiPhoto({ src, boxes = [], natural }) {
  return (
    <div className="aiphoto">
      <img src={src} alt="Photo of the wall crack" />
      {natural && boxes.map((b, i) => (
        <div key={i} className={'box' + (b.y / natural.h < 0.1 ? ' in' : '')} style={{
          left: (b.x / natural.w) * 100 + '%', top: (b.y / natural.h) * 100 + '%',
          width: (b.w / natural.w) * 100 + '%', height: (b.h / natural.h) * 100 + '%',
        }}>
          <span>{b.label}{b.conf != null ? ' ' + b.conf.toFixed(2) : ''}</span>
        </div>
      ))}
    </div>
  );
}
