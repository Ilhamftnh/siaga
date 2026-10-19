// Drawn illustrations used only when the trained model is not loaded.
// Results on these are labelled "sample", never shown as model output.

function wall(g, w, h) {
  g.fillStyle = '#e9e4d8'; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 2500; i++) {
    const v = 215 + Math.floor(Math.random() * 30);
    g.fillStyle = `rgb(${v},${v - 4},${v - 14})`;
    g.fillRect(Math.random() * w, Math.random() * h, 2, 2);
  }
}
function crack(g, pts, width) {
  g.strokeStyle = '#3d342c'; g.lineJoin = 'round'; g.lineCap = 'round';
  g.lineWidth = width; g.beginPath(); g.moveTo(pts[0][0], pts[0][1]);
  pts.slice(1).forEach((p) => g.lineTo(p[0], p[1])); g.stroke();
}
function jag(x0, y0, x1, y1, n, amp) {
  const out = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const nx = -(y1 - y0), ny = x1 - x0, L = Math.hypot(nx, ny) || 1;
    const o = i === 0 || i === n ? 0 : (Math.random() - 0.5) * amp;
    out.push([x0 + (x1 - x0) * t + (nx / L) * o, y0 + (y1 - y0) * t + (ny / L) * o]);
  }
  return out;
}

export function makeSample(kind) {
  const w = 640, h = 480;
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d');
  wall(g, w, h);
  let box;
  if (kind === 'Diagonal') {
    g.fillStyle = '#9fc4d8'; g.fillRect(40, 250, 200, 190);
    g.strokeStyle = '#2c3236'; g.lineWidth = 12; g.strokeRect(40, 250, 200, 190);
    crack(g, jag(246, 244, 470, 60, 14, 18), 4); box = { x: 230, y: 45, w: 255, h: 215 };
  } else if (kind === 'Horizontal') {
    crack(g, jag(70, 230, 580, 250, 18, 16), 4); box = { x: 55, y: 205, w: 540, h: 70 };
  } else if (kind === 'Vertical') {
    crack(g, jag(330, 40, 315, 440, 16, 18), 4); box = { x: 280, y: 30, w: 85, h: 420 };
  } else {
    crack(g, jag(140, 170, 500, 300, 22, 8), 1.2); box = { x: 125, y: 150, w: 390, h: 170 };
  }
  g.fillStyle = 'rgba(0,0,0,.55)'; g.font = '15px sans-serif';
  g.fillText('Illustration: ' + kind.toLowerCase() + ' crack', 14, h - 14);
  return { src: c.toDataURL('image/jpeg', 0.85), kind, box, w, h };
}

// Shrink a photo before saving it, so the demo stays within browser storage limits.
export function shrink(img, max = 900) {
  const r = Math.min(1, max / Math.max(img.width, img.height));
  const c = document.createElement('canvas');
  c.width = Math.round(img.width * r); c.height = Math.round(img.height * r);
  c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
  return { src: c.toDataURL('image/jpeg', 0.8), w: c.width, h: c.height, scale: r };
}

export function loadImage(src) {
  return new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });
}
