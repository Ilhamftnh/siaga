// Minimal hash router: #/house, #/app/resident/<tab>/<id>, #/app/technician/<tab>/<id>
// Hash routes work on any static host (Vercel, GitHub Pages, the published artifact) without server rules.
import { useEffect, useState } from 'react';

const parse = () => (window.location.hash.replace(/^#\/?/, '') || '').split('/').filter(Boolean).map(decodeURIComponent);

export function useRoute() {
  const [parts, setParts] = useState(parse);
  useEffect(() => {
    const on = () => { setParts(parse()); window.scrollTo(0, 0); };
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return parts;
}

export function go(path) {
  const h = '#/' + path.replace(/^\/+/, '');
  if (window.location.hash !== h) window.location.hash = h;
}
export const href = (path) => '#/' + path.replace(/^\/+/, '');
