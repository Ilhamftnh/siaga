// A small line-icon set drawn for SIAGA (24px grid, 1.75 stroke). Icons are used only where they help recognition.
const P = {
  home: 'M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-4.5v-6h-5v6H5a1 1 0 0 1-1-1z',
  plan: 'M4 4h16v16H4zM4 11h7M11 4v16M15 11h5M15 11v4',
  devices: 'M7 3h10a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1zM10 17h4',
  wrench: 'M14.7 6.3a4 4 0 0 0-5.4 5.4L3.6 17.4a1.4 1.4 0 0 0 2 2l5.7-5.7a4 4 0 0 0 5.4-5.4l-2.4 2.4-2.1-.6-.6-2.1z',
  bell: 'M6 16V11a6 6 0 1 1 12 0v5l1.5 2h-15zM10 20.5a2.2 2.2 0 0 0 4 0',
  user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4.5 20.5a7.5 7.5 0 0 1 15 0',
  drop: 'M12 3.5s-6 6.6-6 10.7a6 6 0 0 0 12 0c0-4.1-6-10.7-6-10.7z',
  crack: 'M4 4h16v16H4zM9 4l2.5 5-2 3 3.5 3.5-1 4.5',
  hub: 'M4 13h16v6H4zM8 16h.01M12 16h.01M8.5 9.5a5 5 0 0 1 7 0M6 7a8.5 8.5 0 0 1 12 0',
  camera: 'M4 8h3.2l1.6-2.5h6.4L16.8 8H20v11H4zM12 16.5a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
  plus: 'M12 5v14M5 12h14',
  check: 'M5 12.5 10 17l9-10',
  x: 'M6 6l12 12M18 6 6 18',
  right: 'M9.5 6l6 6-6 6',
  left: 'M14.5 6l-6 6 6 6',
  alert: 'M12 4 2.8 19.5h18.4zM12 10v4.5M12 17h.01',
  clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7.5V12l3 2',
  calendar: 'M4 6h16v14H4zM4 10h16M8 3.5v4M16 3.5v4',
  search: 'M10.5 17a6.5 6.5 0 1 0 0-13 6.5 6.5 0 0 0 0 13zM15.5 15.5 20 20',
  grid: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z',
  list: 'M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01',
  clipboard: 'M8 4h8v3H8zM6 5.5H5v15h14v-15h-1M9 12h6M9 16h4',
  history: 'M4 12a8 8 0 1 0 2.4-5.7L4 8.5M4 4v4.5h4.5M12 8v4l3 2',
  map: 'M4 6.5 9 4l6 2.5L20 4v13.5L15 20l-6-2.5L4 20zM9 4v13.5M15 6.5V20',
  offline: 'M3 3l18 18M8.5 16.5a5 5 0 0 1 3.5-1.5M5.5 13a9 9 0 0 1 4-2.2M12 19h.01M15 11.5a9 9 0 0 1 3.5 1.5M18.5 9.5a13 13 0 0 1 2.5 1.8M3 11.3A13 13 0 0 1 7.2 8.6',
  battery: 'M3 8h15v8H3zM21 11v2',
  play: 'M8 5.5v13l10-6.5z',
  logout: 'M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10',
  external: 'M14 4h6v6M20 4l-9 9M18 14v6H4V6h6',
  house3d: 'M3 10 12 4l9 6M5 9v11h14V9M9 20v-6h6v6',
  info: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 11v5M12 8h.01',
  pin: 'M12 21s-6.5-6-6.5-11a6.5 6.5 0 0 1 13 0c0 5-6.5 11-6.5 11zM12 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z',
  phone: 'M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a1 1 0 0 1-1 1A16 16 0 0 1 4 5a1 1 0 0 1 1-1z',
  filter: 'M4 5h16l-6 7.5V19l-4 1.5v-8z',
  refresh: 'M20 11a8 8 0 1 0-2.3 5.7M20 5v6h-6',
  dot: 'M12 14.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z',
  chip: 'M7 7h10v10H7zM10 4v3M14 4v3M10 17v3M14 17v3M4 10h3M4 14h3M17 10h3M17 14h3',
};

export default function Icon({ name, size = 20, className = '', title }) {
  const d = P[name];
  return (
    <svg className={'icon ' + className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden={title ? undefined : true} role={title ? 'img' : undefined}>
      {title && <title>{title}</title>}
      <path d={d} />
    </svg>
  );
}
