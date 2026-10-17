import { ROOMS } from '../../shared/data/seed.js';
import { deviceState } from '../../shared/services/store.jsx';

// Device positions on the plan (plan units, same scale as ROOMS; matches the 3D house)
export const DEVICE_POS = {
  'leak-kitchen': [22.1, 12.2],
  'leak-basin': [21.8, 4.4],
  'leak-laundry': [4, 2.4],
  hub: [9.4, 2.7],
  'crack-w3': [0.05, 11.6],
};

// Architectural floor plan of the demo home with live device marks
export function FloorPlan({ floor, devices, selected, onSelect, compact }) {
  const rooms = ROOMS.filter((r) => r.floor === floor);
  const hubOn = devices.hub.online;
  const devs = Object.values(devices).filter((d) => DEVICE_POS[d.id] && rooms.some((r) => r.id === d.room));
  return (
    <svg className={'plan' + (compact ? ' compact' : '')} viewBox="-1.2 -1.2 26.4 18.4" role="group" aria-label="Floor plan">
      <rect x="0" y="0" width="24" height="16" className="plan-shell" />
      {rooms.map((r) => {
        const sel = selected === r.id;
        const n = devs.filter((d) => d.room === r.id).length;
        return (
          <g key={r.id} className={'plan-room' + (sel ? ' sel' : '')} role={onSelect ? 'button' : undefined}
            tabIndex={onSelect ? 0 : undefined} aria-pressed={onSelect ? sel : undefined}
            aria-label={onSelect ? `${r.name}, ${n} device${n === 1 ? '' : 's'}` : undefined}
            onClick={onSelect ? () => onSelect(r.id) : undefined}
            onKeyDown={onSelect ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(r.id); } } : undefined}>
            <rect x={r.x} y={r.y} width={r.w} height={r.h} />
            {!compact && <text x={r.x + 0.6} y={r.y + 1.3}>{r.name}</text>}
          </g>
        );
      })}
      {floor === 'ground' && (
        <g className="plan-marks" aria-hidden="true">
          <line x1="0" y1="6.6" x2="0" y2="10.4" className="plan-window" />
          {!compact && <text x="0.5" y="8.9" className="plan-note">W3</text>}
          <line x1="12.5" y1="16" x2="15" y2="16" className="plan-door" />
          {!compact && <text x="12.4" y="17.05" className="plan-note">Front door</text>}
          <path d="M12 1.9h3.6M12 2.8h3.6M12 3.7h3.6M12 4.6h3.6M12 5.5h3.6M12 1.9v4.5" className="plan-stairs" />
        </g>
      )}
      {floor === 'first' && <path d="M12 1.9h3.6M12 2.8h3.6M12 3.7h3.6M12 1.9v2.7" className="plan-stairs" aria-hidden="true" />}
      {devs.map((d) => {
        const [x, y] = DEVICE_POS[d.id];
        const st = deviceState(d, hubOn);
        return (
          <g key={d.id} className={'plan-dev s-' + st.key} transform={`translate(${x} ${y})`} aria-hidden="true">
            {st.key === 'alert' && <circle r="1.25" className="halo" />}
            <circle r={d.kind === 'hub' ? 0.5 : 0.62} />
            {d.kind === 'crack' && <path d="M-0.2 -0.35 L0.15 -0.05 L-0.1 0.15 L0.2 0.4" className="glyph" />}
            {d.kind === 'leak' && <path d="M0 -0.36 C0.3 0 0.3 0.12 0.3 0.12 A0.3 0.3 0 0 1 -0.3 0.12 C-0.3 0.12 -0.3 0 0 -0.36Z" className="glyph fill" />}
          </g>
        );
      })}
    </svg>
  );
}

// Crack movement chart: movement since the monitor was fitted, against the technician's alert limit
export function MoveChart({ readings = [], limit, height = 150 }) {
  const W = 340, H = height, L = 36, R = 8, T = 10, B = 22;
  const pts = readings.slice(-60);
  const max = Math.max(limit ? limit * 1.4 : 1, ...pts.map((p) => p.mm), 0.2);
  const x = (i) => L + (pts.length < 2 ? 0 : (i / (pts.length - 1)) * (W - L - R));
  const y = (v) => T + (1 - v / max) * (H - T - B);
  const ticks = [0, max / 2, max];
  return (
    <svg className="chart" viewBox={`0 0 ${W} ${H}`} width="100%" role="img"
      aria-label={`Crack movement, latest ${pts.length ? pts[pts.length - 1].mm.toFixed(2) : 0} mm, limit ${limit} mm`}>
      {ticks.map((v, i) => (
        <g key={i}>
          <line x1={L} x2={W - R} y1={y(v)} y2={y(v)} className="grid" />
          <text x={L - 6} y={y(v) + 4} textAnchor="end" className="axis">{v.toFixed(2)}</text>
        </g>
      ))}
      {limit != null && (
        <g>
          <line x1={L} x2={W - R} y1={y(limit)} y2={y(limit)} className="limit" />
          <text x={W - R} y={y(limit) - 5} textAnchor="end" className="axis limit-t">Limit {limit} mm</text>
        </g>
      )}
      {pts.length > 1 && <polyline className="series" points={pts.map((p, i) => x(i) + ',' + y(p.mm)).join(' ')} />}
      {pts.length > 0 && <circle cx={x(pts.length - 1)} cy={y(pts[pts.length - 1].mm)} r="3.5" className="series-dot" />}
      <text x={L} y={H - 5} className="axis">Movement since fitted (mm)</text>
    </svg>
  );
}

// Photo with the AI model's box drawn on top
export function AiPhoto({ src, boxes = [], w, h, alt = 'Photo of the wall crack' }) {
  return (
    <div className="aiphoto">
      <img src={src} alt={alt} />
      {w && boxes.map((b, i) => (
        <div key={i} className={'aibox' + (b.y / h < 0.1 ? ' in' : '')} style={{
          left: (b.x / w) * 100 + '%', top: (b.y / h) * 100 + '%', width: (b.w / w) * 100 + '%', height: (b.h / h) * 100 + '%',
        }}>
          <span>{b.label}{b.conf != null ? ' ' + b.conf.toFixed(2) : ''}</span>
        </div>
      ))}
    </div>
  );
}

export const KIND_ICON = { leak: 'drop', crack: 'crack', hub: 'hub' };
