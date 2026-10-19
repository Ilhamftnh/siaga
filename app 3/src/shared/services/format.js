const loc = 'en-MY';
export function fmtDateTime(ms) {
  return new Date(ms).toLocaleString(loc, { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
}
export function fmtDate(ms) {
  return new Date(ms).toLocaleDateString(loc, { day: 'numeric', month: 'short', year: 'numeric' });
}
export function fmtTime(ms) {
  return new Date(ms).toLocaleTimeString(loc, { hour: 'numeric', minute: '2-digit' });
}
export function fmtVisit(ms) {
  return new Date(ms).toLocaleString(loc, { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
}
export function ago(ms, now = Date.now()) {
  const s = Math.max(0, Math.round((now - ms) / 1000));
  if (s < 45) return 'just now';
  const m = Math.round(s / 60);
  if (m < 60) return m + ' min ago';
  const h = Math.round(m / 60);
  if (h < 24) return h + ' h ago';
  const d = Math.round(h / 24);
  if (d === 1) return 'yesterday';
  if (d < 14) return d + ' days ago';
  return fmtDate(ms);
}
export function duration(ms) {
  const m = Math.round(ms / 60000);
  if (m < 60) return m + ' min';
  const h = m / 60;
  return h < 48 ? h.toFixed(1) + ' h' : (h / 24).toFixed(1) + ' days';
}
export function dayKey(ms) {
  const d = new Date(ms); d.setHours(0, 0, 0, 0); return d.getTime();
}
export function dayLabel(ms) {
  const today = dayKey(Date.now()); const k = dayKey(ms);
  if (k === today) return 'Today';
  if (k === today - 86400000) return 'Yesterday';
  if (k === today + 86400000) return 'Tomorrow';
  return new Date(ms).toLocaleDateString(loc, { weekday: 'long', day: 'numeric', month: 'short' });
}
// value for <input type="datetime-local">
export function toLocalInput(ms) {
  const d = new Date(ms); const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}
