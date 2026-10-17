import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

// 3D model of the demo home. It shows where SIAGA's devices sit and reacts to the simulated sensor inputs.
// Props: leaks {kitchen, basin, laundry} each 'dry' | 'wet' | 'off', hubOn, crackMm, monitored (crack monitor fitted)

const VIEWS = {
  outside: { p: [40, 30, 52], t: [0, 7, 0], open: false },
  inside: { p: [16, 30, 34], t: [2, 1, -1], open: true },
  crack: { p: [-38, 10, 16], t: [-12, 5, 2], open: false },
};

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
    el.appendChild(renderer.domElement);
    const scene = new THREE.Scene(); scene.background = new THREE.Color(0xe3eaee);
    const camera = new THREE.PerspectiveCamera(32, 1, 1, 500);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true; controls.maxPolarAngle = Math.PI * 0.49; controls.minDistance = 10; controls.maxDistance = 140;

    const M = (c, o) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.85, ...o });
    const box = (w, h, d, m, x, y, z, p = scene) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y, z); b.castShadow = b.receiveShadow = true; p.add(b); return b; };
    const cyl = (r, h, m, x, y, z, p = scene) => { const b = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 18), m); b.position.set(x, y, z); b.castShadow = true; p.add(b); return b; };
    const wall = M(0xf2eee4), inner = M(0xece5d6), floor = M(0xd8cfbb), white = M(0xfafafa, { roughness: 0.4 }), dark = M(0x2b2f33), glass = M(0x9fc6d8, { roughness: 0.1, transparent: true, opacity: 0.55 }), roofM = M(0x4a4f56), steel = M(0xbfc5c9, { metalness: 0.6, roughness: 0.35 }), wood = M(0x9a7248), grass = M(0x4c9a58), accent = M(0x2b4c9b);

    box(60, 1, 46, grass, 0, -0.5, 4).castShadow = false;
    box(60, 0.1, 6, M(0x3a3f43), 0, 0.05, 24);
    box(26.4, 0.5, 18.4, M(0xbdbdb7), 0, 0.25, 0);
    box(24, 0.4, 16, floor, 0, 0.6, 0);
    // ground floor shell
    box(24, 8, 0.5, wall, 0, 4.8, -7.75);
    const leftWall = box(0.5, 8, 16, wall, -11.75, 4.8, 0);
    box(0.5, 8, 16, wall, 11.75, 4.8, 0);
    const front = new THREE.Group(); scene.add(front);
    box(24, 8, 0.5, wall, 0, 4.8, 7.75, front);
    box(2.4, 5.6, 0.2, M(0x5b3a22), -6, 3.6, 8.05, front);
    box(5, 3.2, 0.2, glass, 3, 5, 8.05, front);
    // window on the left wall (where the crack is)
    box(0.2, 3, 4, glass, -12.05, 5, 0.5);
    box(0.3, 0.3, 4.6, dark, -12.1, 6.65, 0.5); box(0.3, 0.3, 4.6, dark, -12.1, 3.35, 0.5);
    // partitions and rooms
    box(0.3, 8, 7, inner, 4, 4.8, -4.2);
    box(7.6, 8, 0.3, inner, 7.9, 4.8, -0.7);
    box(0.3, 8, 6, inner, -4.5, 4.8, -4.7);
    // kitchen: counter with sink at the right front
    box(1.8, 2.6, 6.5, white, 10.6, 2.1, 4);
    box(1.9, 0.15, 6.6, dark, 10.6, 3.45, 4);
    box(1.2, 0.1, 1.6, steel, 10.6, 3.55, 4.2);
    cyl(0.07, 1.6, steel, 11.3, 4.3, 4.2);
    box(5, 2.6, 1.8, white, 7, 2.1, 6.6); box(5.1, 0.15, 1.9, dark, 7, 3.45, 6.6);
    // bathroom (right back): basin and toilet
    box(1.8, 0.3, 1.2, white, 10.6, 3.1, -3.6); cyl(0.35, 2.2, white, 10.6, 1.9, -3.6);
    box(1.6, 2, 0.08, M(0xcfe3ea, { metalness: 0.6, roughness: 0.05 }), 11.55, 5.2, -3.6).rotation.y = Math.PI / 2;
    box(1.4, 1.1, 1.8, white, 6, 1.4, -6.4);
    // laundry (left back): washing machine
    box(2.4, 3, 2.4, white, -9.8, 2.3, -5.9); cyl(0.8, 0.1, M(0x1c2328), -9.8, 2.4, -4.68).rotation.x = Math.PI / 2;
    // living room
    box(5.4, 1, 2.2, M(0x56708a), -5, 1.3, 4.8); box(5.4, 1.6, 0.5, M(0x56708a), -5, 2.2, 5.7);
    box(2.6, 0.25, 1.3, wood, -5, 1.5, 2.2);
    // upper floor and roof
    const upper = new THREE.Group(); scene.add(upper);
    box(24.4, 0.5, 16.4, M(0xbdbdb7), 0, 9.05, 0, upper);
    box(24, 7, 16, wall, 0, 12.8, 0, upper);
    box(5, 3, 0.2, glass, -6, 13, 8.1, upper); box(5, 3, 0.2, glass, 5, 13, 8.1, upper);
    box(24.6, 0.4, 0.3, accent, 0, 9.3, 8.25, upper);
    const sh = new THREE.Shape(); sh.moveTo(-9.6, 0); sh.lineTo(9.6, 0); sh.lineTo(0, 4.8); sh.closePath();
    const rg = new THREE.ExtrudeGeometry(sh, { depth: 25.6, bevelEnabled: false }); rg.translate(0, 0, -12.8); rg.rotateY(-Math.PI / 2);
    const roof = new THREE.Mesh(rg, roofM); roof.position.y = 16.3; roof.castShadow = true; upper.add(roof);
    // trees
    [[-20, -10], [20, -9], [21, 13]].forEach(([x, z]) => { cyl(0.35, 4, wood, x, 2, z); const s = new THREE.Mesh(new THREE.SphereGeometry(2.6, 16, 12), M(0x2f7a3c)); s.position.set(x, 5.6, z); s.castShadow = true; scene.add(s); });

    // devices
    const label = (text) => {
      const c = document.createElement('canvas'); const g = c.getContext('2d'); g.font = '600 38px sans-serif';
      const w = Math.ceil(g.measureText(text).width) + 36; c.width = w; c.height = 60;
      g.fillStyle = 'rgba(35,38,42,.92)'; g.fillRect(0, 0, w, 60); g.fillStyle = '#fff'; g.font = '600 38px sans-serif'; g.textBaseline = 'middle'; g.fillText(text, 18, 32);
      const t = new THREE.CanvasTexture(c); const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthTest: false, transparent: true }));
      sp.scale.set((1.1 * w) / 60, 1.1, 1); sp.renderOrder = 10; scene.add(sp); return sp;
    };
    const devices = {};
    const mkLeak = (id, name, x, z, lx, ly, lz) => {
      const g = new THREE.Group(); g.position.set(x, 0.85, z); scene.add(g);
      box(0.9, 0.35, 0.6, white, 0, 0, 0, g);
      const led = new THREE.Mesh(new THREE.SphereGeometry(0.14, 12, 8), new THREE.MeshStandardMaterial({ color: 0x22c55e, emissive: 0x22c55e, emissiveIntensity: 1.5 }));
      led.position.set(0.25, 0.2, 0.2); g.add(led);
      const pud = new THREE.Mesh(new THREE.CircleGeometry(1.4, 28), new THREE.MeshBasicMaterial({ color: 0x3d8fd9, transparent: true, opacity: 0, depthWrite: false }));
      pud.rotation.x = -Math.PI / 2; pud.position.set(x, 0.82, z); scene.add(pud);
      const light = new THREE.PointLight(0xff3b30, 0, 10, 2); light.position.set(x, 2, z); scene.add(light);
      const lb = label(name); lb.position.set(lx, ly, lz);
      devices[id] = { led, pud, light, lb };
    };
    mkLeak('kitchen', 'Under kitchen sink', 10.1, 4.2, 9, 5.2, 4.2);
    mkLeak('basin', 'Bathroom basin', 9.8, -3.6, 8.6, 5.2, -3.6);
    mkLeak('laundry', 'Laundry area', -8, -5.6, -8, 5.4, -4.6);
    // SIAGA hub (ESP32) on the hall wall
    box(1.4, 1, 0.4, white, -2.6, 4.2, -7.35);
    const hubLed = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 8), new THREE.MeshStandardMaterial({ color: 0x22c55e, emissive: 0x22c55e, emissiveIntensity: 1.5 }));
    hubLed.position.set(-2.15, 4.45, -7.1); scene.add(hubLed);
    const hubLabel = label('SIAGA hub'); hubLabel.position.set(-2.6, 6.4, -7);
    // crack on the outside of the left wall, from the window corner
    const pts = [[-12.02, 6.65, 2.8], [-12.02, 7.1, 3.25], [-12.02, 7.4, 3.4], [-12.02, 7.9, 4.0], [-12.02, 8.4, 4.25]].map((p) => new THREE.Vector3(...p));
    const curve = new THREE.CatmullRomCurve3(pts);
    const crack = new THREE.Mesh(new THREE.TubeGeometry(curve, 24, 0.04, 6), new THREE.MeshBasicMaterial({ color: 0x3a2f27 })); scene.add(crack);
    const glow = new THREE.Mesh(new THREE.TubeGeometry(curve, 24, 0.14, 8), new THREE.MeshBasicMaterial({ color: 0xff6b35, transparent: true, opacity: 0, depthWrite: false })); scene.add(glow);
    const monitor = new THREE.Group(); monitor.position.set(-12.15, 7.55, 3.55); monitor.rotation.y = -Math.PI / 2; scene.add(monitor);
    box(1.6, 0.35, 0.25, M(0xf2c200), 0, 0, 0, monitor); box(0.5, 0.6, 0.3, white, -0.9, 0, 0, monitor); box(0.5, 0.6, 0.3, white, 0.9, 0, 0, monitor);
    const crackLabel = label('Wall crack'); crackLabel.position.set(-13.4, 9.6, 3.4);

    scene.add(new THREE.HemisphereLight(0xeef5ff, 0x7a9a78, 0.85));
    const sun = new THREE.DirectionalLight(0xfff2dc, 1.2); sun.position.set(28, 46, 34); sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, { left: -40, right: 40, top: 40, bottom: -40, near: 1, far: 160 }); sun.shadow.bias = -0.0008;
    scene.add(sun);

    const st = { leaks: {}, hubOn: true, crackMm: 0, monitored: false, tw: null, view: 'outside' };
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    function goView(name, instant) {
      const v = VIEWS[name]; st.view = name;
      front.visible = !v.open; upper.visible = !v.open;
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
    api.current = { st, goView };
    return () => { cancelAnimationFrame(raf); ro.disconnect(); controls.dispose(); renderer.dispose(); el.removeChild(renderer.domElement); };
  }, []);

  useEffect(() => { if (api.current) Object.assign(api.current.st, { leaks, hubOn, crackMm, monitored }); }, [leaks, hubOn, crackMm, monitored]);
  useEffect(() => { if (api.current && view !== api.current.st.view) api.current.goView(view); }, [view]);

  if (failed) return <div className="three-fail">The 3D view needs WebGL, which this browser has turned off. Everything else still works.</div>;
  return (
    <div className="three-wrap">
      <div ref={mount} className="three" aria-label="3D model of the demo home with SIAGA sensors" role="img" />
      <div className="viewbtns" role="group" aria-label="3D view">
        {[['outside', 'Outside'], ['inside', 'Inside, sensors'], ['crack', 'Side wall, W3']].map(([k, t]) => (
          <button key={k} aria-pressed={view === k} onClick={() => setView(k)}>{t}</button>
        ))}
      </div>
    </div>
  );
}
