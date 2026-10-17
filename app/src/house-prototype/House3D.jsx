import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

// 3D model of the demo home: a contemporary two-storey end-lot terrace house.
// It shows where SIAGA's devices sit and reacts to the simulated sensor inputs.
// Props: leaks {kitchen, basin, laundry} each 'dry' | 'wet' | 'off', hubOn, crackMm, monitored (crack monitor fitted)
// Ground-floor layout and device positions match the floor plan in the apps (x -12..12, z -8..8; +z faces the street).

const VIEWS = {
  outside: { p: [-30, 24, 70], t: [-1, 7, 5], open: false },
  inside: { p: [-12, 42, 30], t: [2, 1, -0.5], open: true },
  crack: { p: [-42, 12, 18], t: [-12, 6.5, 2], open: false },
};

// Procedural textures so the model needs no image files
function canvasTex(w, h, draw, rx = 1, ry = 1) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}
const woodTex = (rx, ry) => canvasTex(256, 256, (g, w, h) => {
  g.fillStyle = '#a8764a'; g.fillRect(0, 0, w, h);
  for (let x = 0; x < w; x += 2) { g.fillStyle = `rgba(${90 + Math.random() * 40},${55 + Math.random() * 25},${30 + Math.random() * 15},${0.08 + Math.random() * 0.12})`; g.fillRect(x, 0, 2, h); }
  for (let i = 0; i < 18; i++) { g.strokeStyle = 'rgba(70,40,20,.18)'; g.beginPath(); const x = Math.random() * w; g.moveTo(x, 0); g.bezierCurveTo(x + 6, h * 0.3, x - 6, h * 0.6, x + 3, h); g.stroke(); }
}, rx, ry);
const paverTex = (rx, ry) => canvasTex(256, 256, (g, w, h) => {
  g.fillStyle = '#9b9790'; g.fillRect(0, 0, w, h);
  const bw = 64, bh = 32;
  for (let y = 0; y < h; y += bh) for (let x = -((y / bh) % 2) * bw / 2; x < w; x += bw) {
    const v = 150 + Math.random() * 25; g.fillStyle = `rgb(${v},${v - 4},${v - 10})`; g.fillRect(x + 1.5, y + 1.5, bw - 3, bh - 3);
  }
}, rx, ry);
const tileTex = (rx, ry) => canvasTex(256, 256, (g, w, h) => {
  g.fillStyle = '#d9d4ca'; g.fillRect(0, 0, w, h);
  for (let y = 0; y < h; y += 64) for (let x = 0; x < w; x += 64) { const v = 228 + Math.random() * 10; g.fillStyle = `rgb(${v},${v - 3},${v - 9})`; g.fillRect(x + 1, y + 1, 62, 62); }
}, rx, ry);
const grassTex = (rx, ry) => canvasTex(256, 256, (g, w, h) => {
  g.fillStyle = '#6f9a4f'; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 4000; i++) { const v = Math.random(); g.fillStyle = v > 0.5 ? 'rgba(130,170,90,.35)' : 'rgba(60,100,45,.35)'; g.fillRect(Math.random() * w, Math.random() * h, 1.5, 3); }
}, rx, ry);

export default function House3D({ leaks, hubOn = true, crackMm, monitored, view, setView }) {
  const mount = useRef(null);
  const api = useRef(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const el = mount.current;
    let renderer;
    try { renderer = new THREE.WebGLRenderer({ antialias: true }); } catch (e) { setFailed(true); return undefined; }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
    el.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    scene.background = canvasTex(4, 256, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#9cc3e4'); gr.addColorStop(0.65, '#dfeaf2'); gr.addColorStop(1, '#eef2f1'); g.fillStyle = gr; g.fillRect(0, 0, w, h); });
    scene.background.wrapS = scene.background.wrapT = THREE.ClampToEdgeWrapping;
    scene.fog = new THREE.Fog(0xe4ecf0, 140, 300);
    const camera = new THREE.PerspectiveCamera(32, 1, 1, 600);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true; controls.maxPolarAngle = Math.PI * 0.49; controls.minDistance = 10; controls.maxDistance = 160;

    const M = (c, o) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.85, ...o });
    const box = (w, h, d, m, x, y, z, p = scene) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y, z); b.castShadow = b.receiveShadow = true; p.add(b); return b; };
    const cyl = (r, h, m, x, y, z, p = scene, seg = 18) => { const b = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, seg), m); b.position.set(x, y, z); b.castShadow = true; p.add(b); return b; };

    // palette: off-white render, warm grey, charcoal frames, timber accents
    const render = M(0xf3f1ec, { roughness: 0.9 });
    const greyClad = M(0x8f8a84, { roughness: 0.8 });
    const charcoal = M(0x2e3134, { roughness: 0.55 });
    const inner = M(0xefebe3), white = M(0xfbfbfa, { roughness: 0.35 });
    const glass = new THREE.MeshPhysicalMaterial({ color: 0x7f9fb1, roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.5, reflectivity: 0.6 });
    const timber = M(0xffffff, { map: woodTex(1, 1), roughness: 0.7 });
    const timberV = M(0xffffff, { map: woodTex(3, 1), roughness: 0.7 });
    const steel = M(0xc3c7ca, { metalness: 0.7, roughness: 0.3 });
    const concrete = M(0xc9c6bf, { roughness: 0.95 });
    const stone = M(0x55585b, { roughness: 0.9 });

    // ---------- site ----------
    const ground = box(120, 1, 80, M(0xffffff, { map: grassTex(18, 12) }), 0, -0.5, 6); ground.castShadow = false;
    box(120, 0.12, 9, M(0x47494c, { roughness: 0.95 }), 0, 0.06, 26); // road
    box(120, 0.08, 0.3, M(0xe8e6df), 0, 0.13, 26).castShadow = false; // road line
    box(120, 0.35, 3.2, concrete, 0, 0.18, 20.2); // sidewalk
    box(120, 0.45, 0.4, M(0xb9b6ae), 0, 0.22, 21.9); // kerb
    // plot: driveway pavers and garden
    box(11, 0.18, 12.6, M(0xffffff, { map: paverTex(3, 3.5), roughness: 0.9 }), -6.6, 0.09, 13.7); // driveway (left, under porch)
    box(5.4, 0.16, 3.6, M(0xffffff, { map: paverTex(1.5, 1), roughness: 0.9 }), 1.4, 0.08, 9.9); // path to door
    // boundary: low wall, black bar gates
    const fence = new THREE.Group(); scene.add(fence);
    box(0.5, 1.6, 26, render, -16.3, 0.8, 6.2, fence); // left side wall (end lot)
    box(0.5, 1.2, 12, render, 12.3, 0.6, 13.2, fence); // party boundary at front
    box(16.4, 1.2, 0.5, render, 4.4, 0.6, 19.2, fence); // front wall right of gate
    for (let i = 0; i < 22; i++) box(0.09, 1.6, 0.09, charcoal, -0.6 + i * 0.6, 2, 19.2, fence); // bars above wall
    box(13.4, 0.12, 0.12, charcoal, 5.7, 2.8, 19.2, fence);
    box(4, 1.2, 0.5, render, -14.3, 0.6, 19.2, fence); // wall left of the gate
    // sliding gate at the driveway
    for (let i = 0; i < 18; i++) box(0.1, 2.6, 0.1, charcoal, -11.8 + i * 0.6, 1.4, 19.3, fence);
    box(11, 0.15, 0.15, charcoal, -6.7, 2.7, 19.3, fence); box(11, 0.15, 0.15, charcoal, -6.7, 0.25, 19.3, fence);
    box(0.6, 3, 0.6, render, -12.3, 1.5, 19.2, fence); box(0.6, 3, 0.6, render, -1.1, 1.5, 19.2, fence);
    // hedge and shrubs along the garden
    const leaf = M(0x3f7a3a, { roughness: 1 }), leaf2 = M(0x5a8f42, { roughness: 1 });
    box(0.9, 1.1, 16, leaf, -15.4, 0.55, 3);
    [[6, 17.6], [8, 17.8], [10, 17.5], [-14.6, -9]].forEach(([x, z], i) => { const s = new THREE.Mesh(new THREE.SphereGeometry(0.9, 14, 10), i % 2 ? leaf : leaf2); s.position.set(x, 0.75, z); s.castShadow = true; scene.add(s); });
    // trees
    const tree = (x, z, s = 1) => {
      cyl(0.32 * s, 4.5 * s, M(0x6b4c33), x, 2.25 * s, z);
      [[0, 5.6, 0, 2.4], [1.2, 6.4, 0.4, 1.8], [-1, 6.6, -0.5, 1.9], [0.2, 7.6, 0, 1.6]].forEach(([dx, dy, dz, r], i) => {
        const b = new THREE.Mesh(new THREE.IcosahedronGeometry(r * s, 1), i % 2 ? leaf : leaf2); b.position.set(x + dx * s, dy * s, z + dz * s); b.castShadow = true; scene.add(b);
      });
    };
    tree(-22, -6); tree(-21, 12, 0.9); tree(34, 18, 1.1); tree(-30, 22, 0.8); tree(18, 21.3, 0.75);
    // street lamp
    cyl(0.14, 9, charcoal, 16, 4.5, 21.3); box(2.2, 0.2, 0.4, charcoal, 15.1, 9, 21.3);

    // ---------- house: ground floor ----------
    box(26, 0.6, 18, concrete, 0, 0.3, 0); // plinth
    box(24, 0.3, 16, M(0xffffff, { map: tileTex(6, 4), roughness: 0.5 }), 0, 0.65, 0); // floor tiles
    box(24, 8, 0.5, render, 0, 4.8, -7.75); // back wall
    box(0.5, 8, 16, render, -11.75, 4.8, 0); // left wall (W3 side)
    box(0.5, 8, 16, render, 11.75, 4.8, 0); // party wall

    // front facade (hidden in the "inside" view)
    const front = new THREE.Group(); scene.add(front);
    box(4.2, 8, 0.5, render, -9.9, 4.8, 7.75, front); // pier left of sliding doors
    box(7, 1.2, 0.5, render, -4.3, 8.2, 7.75, front); // beam over sliding doors
    box(6.8, 6.6, 0.12, glass, -4.3, 4.1, 7.85, front); // living room sliding doors
    [-7.7, -4.3, -0.9].forEach((x) => box(0.16, 6.6, 0.2, charcoal, x, 4.1, 7.9, front));
    box(7, 0.16, 0.2, charcoal, -4.3, 7.45, 7.9, front);
    box(3.2, 8, 0.5, timber, 1.9, 4.8, 7.75, front); // timber feature wall
    box(1.9, 6, 0.15, M(0x3c2a1e, { roughness: 0.6 }), 1.9, 3.8, 8.05, front); // main door
    box(0.08, 1.2, 0.12, steel, 1.2, 3.8, 8.16, front); // pull handle
    // kitchen wall, built around the window opening
    box(2, 8, 0.5, render, 4.4, 4.8, 7.75, front); box(1.6, 8, 0.5, render, 11.2, 4.8, 7.75, front);
    box(5, 3.8, 0.5, render, 7.9, 2.7, 7.75, front); box(5, 2.2, 0.5, render, 7.9, 7.7, 7.75, front);
    box(5, 2, 0.12, glass, 7.9, 5.6, 7.75, front); // kitchen window (high, over the counter)
    box(5.2, 0.16, 0.2, charcoal, 7.9, 6.65, 7.9, front); box(5.2, 0.16, 0.2, charcoal, 7.9, 4.55, 7.9, front);
    box(0.4, 0.4, 0.4, M(0xf5d38a, { emissive: 0xf5c66a, emissiveIntensity: 0.4 }), 3.6, 6.8, 8.1, front); // door light
    // window W3 on the left wall (where the crack is)
    box(0.15, 3, 4, glass, -12.05, 5, 0.5);
    box(0.3, 0.2, 4.4, charcoal, -12.1, 6.6, 0.5); box(0.3, 0.2, 4.4, charcoal, -12.1, 3.4, 0.5);
    box(0.3, 3.2, 0.2, charcoal, -12.1, 5, -1.7); box(0.3, 3.2, 0.2, charcoal, -12.1, 5, 2.7);
    box(0.5, 0.25, 4.6, concrete, -12.2, 3.25, 0.5); // sill

    // interior partitions and fittings
    box(0.3, 8, 7, inner, 4, 4.8, -4.2);
    box(7.6, 8, 0.3, inner, 7.9, 4.8, -0.7);
    box(0.3, 8, 6, inner, -4.5, 4.8, -4.7);
    // kitchen: counter with sink against the right wall, island-style return
    box(1.8, 2.6, 6.5, white, 10.6, 2.1, 4); box(1.9, 0.15, 6.6, stone, 10.6, 3.45, 4);
    box(1.2, 0.1, 1.6, steel, 10.6, 3.55, 4.2); cyl(0.07, 1.6, steel, 11.3, 4.3, 4.2);
    box(5, 2.6, 1.8, timber, 7, 2.1, 6.6); box(5.1, 0.15, 1.9, stone, 7, 3.45, 6.6);
    // bathroom: vanity basin, mirror, WC
    box(1.8, 0.3, 1.2, white, 10.6, 3.1, -3.6); box(1.6, 1.6, 1.1, timber, 10.6, 2.1, -3.6);
    box(1.6, 2, 0.08, M(0xcfe3ea, { metalness: 0.6, roughness: 0.05 }), 11.55, 5.2, -3.6).rotation.y = Math.PI / 2;
    box(1.4, 1.1, 1.8, white, 6, 1.4, -6.4);
    // laundry: washer
    box(2.4, 3, 2.4, white, -9.8, 2.3, -5.9); cyl(0.8, 0.1, M(0x1c2328), -9.8, 2.4, -4.68).rotation.x = Math.PI / 2;
    // stairs in the hall
    for (let i = 0; i < 8; i++) box(3.4, 0.5, 0.9, timber, 2.1, 1.05 + i * 0.95, -1.6 - i * 0.75);
    // living room: sofa, rug, TV wall
    const sofa = M(0x5f6b73, { roughness: 1 });
    box(5.4, 1, 2.2, sofa, -6, 1.3, 4.8); box(5.4, 1.6, 0.5, sofa, -6, 2.2, 5.7);
    box(5.2, 0.05, 3.4, M(0xd8cbb4, { roughness: 1 }), -6, 0.83, 2.6);
    box(2.6, 0.25, 1.3, timber, -6, 1.5, 2.4);
    box(4, 2.2, 0.15, charcoal, -6, 4.2, -1.1);

    // ---------- house: first floor and roof (hidden in the "inside" view) ----------
    const upper = new THREE.Group(); scene.add(upper);
    box(25, 0.6, 17, concrete, 0, 9.1, 0.2, upper); // slab with slight overhang
    box(0.6, 16.6, 16.6, M(0xe7e3db), 12.3, 8.3, 0, upper); // party wall to neighbour, full height
    box(1.6, 3.2, 6.5, white, 11.1, 7.2, 4, upper); // kitchen wall cabinets
    box(24, 7, 16, render, 0, 12.8, 0, upper); // main upper volume
    // projecting grey box over the porch, with timber louvres
    box(13.2, 7.6, 3.2, greyClad, -5.6, 12.7, 9.2, upper);
    box(12.4, 5.4, 0.1, glass, -5.6, 12.6, 10.85, upper);
    for (let i = 0; i < 22; i++) box(0.22, 5.6, 0.32, timberV, -11.4 + i * 0.55, 12.6, 11.05, upper); // vertical louvres
    // recessed balcony on the right
    box(10.4, 0.35, 2.4, concrete, 6.4, 9.55, 9.1, upper);
    box(10.4, 1.4, 0.06, M(0xbfd6de, { transparent: true, opacity: 0.35, roughness: 0.05 }), 6.4, 10.45, 10.25, upper); // glass railing
    box(10.4, 0.1, 0.1, steel, 6.4, 11.15, 10.25, upper);
    box(7.4, 5.4, 0.12, glass, 6.6, 12.4, 8.05, upper); // balcony sliding doors
    [2.9, 6.6, 10.3].forEach((x) => box(0.16, 5.4, 0.2, charcoal, x, 12.4, 8.1, upper));
    // side windows upstairs (left, above W3) and back
    box(0.12, 3, 5, glass, -12.06, 13, -3, upper); box(0.25, 3.3, 0.18, charcoal, -12.1, 13, -5.5, upper); box(0.25, 3.3, 0.18, charcoal, -12.1, 13, -0.5, upper);
    box(6, 2.6, 0.12, glass, -4, 13, -8.06, upper); box(4, 2.6, 0.12, glass, 6, 13, -8.06, upper);
    // flat roof: slab with charcoal fascia and parapet
    box(26, 0.7, 19.6, charcoal, -0.2, 16.65, 1.4, upper);
    box(25.4, 0.12, 19, M(0x9a9894), -0.2, 17.06, 1.4, upper);
    box(6, 1.6, 4, render, 4, 17.8, -4, upper); // roof access / water tank housing
    // car porch canopy (cantilevered slab)
    box(11.6, 0.55, 8.6, charcoal, -6.6, 8.75, 14.2, upper);
    box(11, 0.08, 8, M(0xe9e6df), -6.6, 8.44, 14.2, upper);
    for (let i = 0; i < 3; i++) box(0.6, 0.06, 0.6, M(0xffffff, { emissive: 0xfff1cc, emissiveIntensity: 0.5 }), -9.5 + i * 3, 8.39, 14.2, upper);
    box(0.4, 8.4, 0.4, charcoal, -12, 4.4, 18.2, upper); // slim steel column

    // car on the driveway
    const car = new THREE.Group(); car.position.set(-6.4, 0, 13.6); scene.add(car);
    const paint = M(0x6e7f8d, { metalness: 0.5, roughness: 0.35 });
    box(4.2, 1.3, 8.6, paint, 0, 1.25, 0, car); box(3.8, 1.2, 4.6, paint, 0, 2.5, -0.4, car);
    box(3.82, 1, 4.3, M(0x22282d, { roughness: 0.15 }), 0, 2.55, -0.4, car);
    [[-2.05, -2.8], [2.05, -2.8], [-2.05, 2.8], [2.05, 2.8]].forEach(([x, z]) => { const w = cyl(0.75, 0.6, M(0x1b1d1f), x, 0.75, z, car, 20); w.rotation.z = Math.PI / 2; });
    box(3.4, 0.25, 0.1, M(0xf0f0e8, { emissive: 0xffffff, emissiveIntensity: 0.2 }), 0, 1.4, 4.31, car);

    // ---------- neighbour unit (attached on the right) ----------
    const nb = new THREE.Group(); nb.position.x = 24.6; scene.add(nb);
    const nRender = M(0xece9e2), nGrey = M(0xa29d96);
    box(26, 0.6, 18, concrete, 0, 0.3, 0, nb);
    box(24, 8, 16, nRender, 0, 4.8, 0, nb);
    box(24, 7, 16, nRender, 0, 12.8, 0, nb);
    box(13.2, 7.6, 3.2, nGrey, 5.6, 12.7, 9.2, nb);
    box(12.4, 5.4, 0.1, glass, 5.6, 12.6, 10.85, nb);
    for (let i = 0; i < 22; i++) box(0.22, 5.6, 0.32, timberV, -0.2 + i * 0.55, 12.6, 11.05, nb);
    box(26, 0.7, 19.6, charcoal, 0.2, 16.65, 1.4, nb);
    box(11.6, 0.55, 8.6, charcoal, 6.6, 8.75, 14.2, nb);
    box(6.8, 6.6, 0.12, glass, 4.3, 4.1, 8.05, nb);
    box(3.2, 7.6, 0.3, timber, -1.9, 4.6, 8.05, nb);
    box(11, 0.18, 12.6, M(0xffffff, { map: paverTex(3, 3.5) }), 6.6, 0.09, 13.7, nb);
    box(16.4, 1.2, 0.5, render, -4.4, 0.6, 19.2, nb);
    nb.traverse((o) => { if (o.isMesh) o.castShadow = true; });

    // ---------- devices ----------
    const label = (text) => {
      const c = document.createElement('canvas'); const g = c.getContext('2d'); g.font = '600 38px Inter, sans-serif';
      const w = Math.ceil(g.measureText(text).width) + 36; c.width = w; c.height = 60;
      g.fillStyle = 'rgba(35,38,42,.92)'; g.fillRect(0, 0, w, 60); g.fillStyle = '#fff'; g.font = '600 38px Inter, sans-serif'; g.textBaseline = 'middle'; g.fillText(text, 18, 32);
      const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthTest: false, transparent: true }));
      sp.scale.set((1.1 * w) / 60, 1.1, 1); sp.renderOrder = 10; scene.add(sp); return sp;
    };
    const devices = {};
    const ledMat = () => new THREE.MeshStandardMaterial({ color: 0x22c55e, emissive: 0x22c55e, emissiveIntensity: 1.5 });
    const mkLeak = (id, name, x, z, lx, ly, lz) => {
      const g = new THREE.Group(); g.position.set(x, 0.95, z); scene.add(g);
      box(0.9, 0.35, 0.6, white, 0, 0, 0, g);
      const led = new THREE.Mesh(new THREE.SphereGeometry(0.14, 12, 8), ledMat()); led.position.set(0.25, 0.2, 0.2); g.add(led);
      const pud = new THREE.Mesh(new THREE.CircleGeometry(1.4, 28), new THREE.MeshBasicMaterial({ color: 0x3d8fd9, transparent: true, opacity: 0, depthWrite: false }));
      pud.rotation.x = -Math.PI / 2; pud.position.set(x, 0.82, z); scene.add(pud);
      const light = new THREE.PointLight(0xff3b30, 0, 10, 2); light.position.set(x, 2, z); scene.add(light);
      const lb = label(name); lb.position.set(lx, ly, lz);
      devices[id] = { led, pud, light, lb };
    };
    mkLeak('kitchen', 'Under kitchen sink', 10.1, 4.2, 9, 5.2, 4.2);
    mkLeak('basin', 'Bathroom basin', 9.8, -3.6, 8.6, 5.2, -3.6);
    mkLeak('laundry', 'Laundry area', -8, -5.6, -8, 5.4, -4.6);
    // SIAGA hub on the hall wall
    box(1.4, 1, 0.4, white, -2.6, 4.2, -7.35);
    const hubLed = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 8), ledMat()); hubLed.position.set(-2.15, 4.45, -7.1); scene.add(hubLed);
    const hubLabel = label('SIAGA hub'); hubLabel.position.set(-2.6, 6.4, -7);
    // crack on the outside of the left wall, from the window corner
    const pts = [[-12.02, 6.7, 2.8], [-12.02, 7.1, 3.25], [-12.02, 7.4, 3.4], [-12.02, 7.9, 4.0], [-12.02, 8.4, 4.25]].map((p) => new THREE.Vector3(...p));
    const curve = new THREE.CatmullRomCurve3(pts);
    scene.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 24, 0.04, 6), new THREE.MeshBasicMaterial({ color: 0x3a2f27 })));
    const glow = new THREE.Mesh(new THREE.TubeGeometry(curve, 24, 0.14, 8), new THREE.MeshBasicMaterial({ color: 0xff6b35, transparent: true, opacity: 0, depthWrite: false })); scene.add(glow);
    const monitor = new THREE.Group(); monitor.position.set(-12.15, 7.55, 3.55); monitor.rotation.y = -Math.PI / 2; scene.add(monitor);
    box(1.6, 0.35, 0.25, M(0xf2c200), 0, 0, 0, monitor); box(0.5, 0.6, 0.3, white, -0.9, 0, 0, monitor); box(0.5, 0.6, 0.3, white, 0.9, 0, 0, monitor);
    const crackLabel = label('Crack at window W3'); crackLabel.position.set(-13.6, 10, 3.4);

    // ---------- light ----------
    scene.add(new THREE.HemisphereLight(0xf2f7ff, 0x8a9a78, 0.9));
    const sun = new THREE.DirectionalLight(0xfff0d8, 2.1); sun.position.set(-30, 52, 40); sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, { left: -50, right: 50, top: 50, bottom: -50, near: 1, far: 180 }); sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.02;
    scene.add(sun);
    const fill = new THREE.DirectionalLight(0xdfe8ff, 0.5); fill.position.set(40, 20, 30); scene.add(fill);

    const st = { leaks: {}, hubOn: true, crackMm: 0, monitored: false, tw: null, view: 'outside' };
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    function goView(name, instant) {
      const v = VIEWS[name]; st.view = name;
      front.visible = !v.open; upper.visible = !v.open; nb.visible = !v.open; fence.visible = !v.open; car.visible = !v.open;
      const f = camera.aspect < 1.1 ? 1.25 / camera.aspect : 1;
      const t = new THREE.Vector3(...v.t); const p = new THREE.Vector3(...v.p).sub(t).multiplyScalar(f).add(t);
      if (instant || reduce) { camera.position.copy(p); controls.target.copy(t); st.tw = null; }
      else st.tw = { p0: camera.position.clone(), t0: controls.target.clone(), p, t, s: performance.now() };
      Object.values(devices).forEach((d) => { d.lb.visible = v.open; });
      hubLabel.visible = v.open;
      crackLabel.visible = name === 'crack';
    }
    function resize() { const w = el.clientWidth, h = el.clientHeight; if (!w || !h) return; renderer.setSize(w, h); camera.aspect = w / h; camera.updateProjectionMatrix(); }
    const ro = new ResizeObserver(resize); ro.observe(el); resize(); goView('outside', true);
    api.current = { st, goView };
    controls.addEventListener('start', () => { st.tw = null; });
    let raf;
    const frame = (now) => {
      if (st.tw) { let k = Math.min(1, (now - st.tw.s) / 900); k = k * k * (3 - 2 * k); camera.position.lerpVectors(st.tw.p0, st.tw.p, k); controls.target.lerpVectors(st.tw.t0, st.tw.t, k); if (k >= 1) st.tw = null; }
      const pulse = reduce ? 0.7 : 0.45 + 0.35 * Math.sin(now * 0.006);
      Object.entries(devices).forEach(([id, d]) => {
        const mode = st.leaks[id] || 'dry';
        const wet = mode === 'wet';
        const c = mode === 'off' ? 0x777b80 : wet ? 0xff3b30 : 0x22c55e;
        d.led.material.color.set(c); d.led.material.emissive.set(c); d.led.material.emissiveIntensity = mode === 'off' ? 0.05 : 1.5;
        d.pud.material.opacity = wet ? Math.min(0.55, d.pud.material.opacity + 0.01) : Math.max(0, d.pud.material.opacity - 0.02);
        d.light.intensity = wet ? pulse * 2.4 : 0;
      });
      monitor.visible = st.monitored;
      const hc = st.hubOn ? 0x22c55e : 0x777b80; hubLed.material.color.set(hc); hubLed.material.emissive.set(hc); hubLed.material.emissiveIntensity = st.hubOn ? 1.5 : 0.05;
      glow.material.opacity = st.crackMm > 0.02 ? Math.min(0.85, 0.25 + st.crackMm) * pulse : 0;
      controls.update(); renderer.render(scene, camera); raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); controls.dispose(); renderer.dispose(); el.removeChild(renderer.domElement); };
  }, []);

  useEffect(() => { if (api.current) Object.assign(api.current.st, { leaks, hubOn, crackMm, monitored }); }, [leaks, hubOn, crackMm, monitored]);
  useEffect(() => { if (api.current && view !== api.current.st.view) api.current.goView(view); }, [view]);

  if (failed) return <div className="three-fail">The 3D view needs WebGL, which this browser has turned off. Everything else still works.</div>;
  return (
    <div className="three-wrap">
      <div ref={mount} className="three" aria-label="3D model of the demo home, a two-storey end-lot terrace house with SIAGA sensors" role="img" />
      <div className="viewbtns" role="group" aria-label="3D view">
        {[['outside', 'Outside'], ['inside', 'Inside, sensors'], ['crack', 'Side wall, W3']].map(([k, t]) => (
          <button key={k} aria-pressed={view === k} onClick={() => setView(k)}>{t}</button>
        ))}
      </div>
    </div>
  );
}
