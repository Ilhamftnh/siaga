// Runs the team's trained YOLOv8n crack model in the browser with ONNX Runtime Web.
// The model file is public/model/best.onnx (from the training notebook). If it is missing,
// the app says so and never shows a made-up confidence as a real result.

import { CLASSES } from '../data/guidance.js';

const SIZE = 640;
let session = null;
let ortMod = null;
let status = 'unchecked'; // unchecked | loading | ready | missing | error
let lastError = '';

export function modelStatus() { return { status, error: lastError }; }

export async function loadModel() {
  if (status === 'ready' || status === 'loading') return status;
  status = 'loading';
  // window.SIAGA_MODEL_URL lets a host that cannot serve .onnx point to the same file under another name.
  const url = new URL(window.SIAGA_MODEL_URL || import.meta.env.BASE_URL + 'model/best.onnx', document.baseURI).href;
  try {
    const head = await fetch(url, { method: 'GET', headers: { Range: 'bytes=0-15' } });
    const type = head.headers.get('content-type') || '';
    if (!head.ok || type.includes('text/html')) { status = 'missing'; return status; }
    ortMod = await import('onnxruntime-web/wasm');
    ortMod.env.wasm.wasmPaths = new URL(import.meta.env.BASE_URL + 'ort/', document.baseURI).href;
    ortMod.env.wasm.numThreads = 1;
    session = await ortMod.InferenceSession.create(url, { executionProviders: ['wasm'] });
    status = 'ready';
  } catch (e) {
    lastError = String(e && e.message ? e.message : e);
    status = 'error';
  }
  return status;
}

function letterbox(img) {
  const c = document.createElement('canvas');
  c.width = SIZE; c.height = SIZE;
  const g = c.getContext('2d');
  g.fillStyle = 'rgb(114,114,114)';
  g.fillRect(0, 0, SIZE, SIZE);
  const r = Math.min(SIZE / img.width, SIZE / img.height);
  const w = Math.round(img.width * r), h = Math.round(img.height * r);
  const dx = Math.floor((SIZE - w) / 2), dy = Math.floor((SIZE - h) / 2);
  g.drawImage(img, dx, dy, w, h);
  const px = g.getImageData(0, 0, SIZE, SIZE).data;
  const data = new Float32Array(3 * SIZE * SIZE);
  for (let i = 0, p = 0; i < SIZE * SIZE; i++, p += 4) {
    data[i] = px[p] / 255;
    data[i + SIZE * SIZE] = px[p + 1] / 255;
    data[i + 2 * SIZE * SIZE] = px[p + 2] / 255;
  }
  return { data, r, dx, dy };
}

function iou(a, b) {
  const x1 = Math.max(a.x, b.x), y1 = Math.max(a.y, b.y);
  const x2 = Math.min(a.x + a.w, b.x + b.w), y2 = Math.min(a.y + a.h, b.y + b.h);
  const inter = Math.max(0, x2 - x1) * Math.max(0, y2 - y1);
  return inter / (a.w * a.h + b.w * b.h - inter);
}

// Returns detections in original image pixels, highest confidence first.
export async function detect(img, minConf = 0.25) {
  if (status !== 'ready') throw new Error('Model not loaded');
  const { data, r, dx, dy } = letterbox(img);
  const input = new ortMod.Tensor('float32', data, [1, 3, SIZE, SIZE]);
  const out = await session.run({ [session.inputNames[0]]: input });
  const t = out[session.outputNames[0]];
  const [, ch, n] = t.dims; // [1, 4 + classes, anchors]
  const v = t.data;
  const boxes = [];
  for (let i = 0; i < n; i++) {
    let best = 0, cls = -1;
    for (let c = 4; c < ch; c++) { const s = v[c * n + i]; if (s > best) { best = s; cls = c - 4; } }
    if (best < minConf) continue;
    const cx = v[i], cy = v[n + i], w = v[2 * n + i], h = v[3 * n + i];
    boxes.push({ x: (cx - w / 2 - dx) / r, y: (cy - h / 2 - dy) / r, w: w / r, h: h / r, conf: best, label: CLASSES[cls] || 'Class ' + cls });
  }
  boxes.sort((a, b) => b.conf - a.conf);
  const keep = [];
  for (const b of boxes) if (keep.every((k) => k.label !== b.label || iou(k, b) < 0.45)) keep.push(b);
  return keep.slice(0, 10);
}
