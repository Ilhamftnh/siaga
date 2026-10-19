import { useEffect, useState } from 'react';
import { DemoBar } from '../application/shared/Shell.jsx';
import { BOM, CATS, LAYOUT, NOT_PRICED, UPGRADE, CHECKED, totals, rm } from '../shared/data/bom.js';
import { CONF_SHOW, CONF_MIN } from '../shared/data/guidance.js';
import '../styles/system.css';

const SECTIONS = [['flow', 'How data flows'], ['sensors', 'Sensors'], ['principle', 'Crack monitor'], ['wiring', 'Wiring'], ['power', 'Battery or wired'], ['ai', 'Rules and AI'], ['cost', 'Costs']];

// Technical reference for judges: what each sensor does, how it is wired and powered,
// where the AI starts and stops, and what one home costs with sourced prices.
export default function SystemPage() {
  useEffect(() => { document.title = 'SIAGA system, wiring and costs'; }, []);
  const t = totals();
  return (
    <>
      <DemoBar current="system" />
      <div className="sys">
        <header className="sys-head">
          <h1>Sensors, wiring, AI and costs</h1>
          <p>For one monitored home: the two-storey terrace in the house prototype. Sensors in the demo are simulated; this page describes the hardware they stand in for.</p>
          <nav className="sys-toc" aria-label="On this page">{SECTIONS.map(([id, t2]) => <a key={id} href={'#' + id} onClick={(e) => { e.preventDefault(); document.getElementById(id).scrollIntoView({ behavior: 'smooth' }); }}>{t2}</a>)}</nav>
        </header>

        <section id="flow" className="sys-sec">
          <h2>How data flows</h2>
          <FlowDiagram />
          <p className="small muted">Each sensor has its own ESP32 node so no cable crosses the house. Nodes report to the hub over Wi-Fi; the hub forwards readings to the SIAGA service, which applies the rules and notifies the apps. In the prototype, the house page plays the part of the nodes and hub, and the browser stores the data.</p>
        </section>

        <section id="sensors" className="sys-sec">
          <h2>Sensors and how many</h2>
          <div className="sys-grid2">
            <div className="panel panel-pad">
              <h3>Quantity from the house layout</h3>
              <table className="sys-table">
                <thead><tr><th>Point</th><th>Room</th><th>Power</th></tr></thead>
                <tbody>
                  {LAYOUT.wetPoints.map((p) => <tr key={p.spot}><td>Leak: {p.spot}<span className="xs muted block">{p.why}</span></td><td>{p.room}</td><td><Pw p={p.power} /></td></tr>)}
                  {LAYOUT.crackPoints.map((p) => <tr key={p.spot}><td>Crack: {p.spot}<span className="xs muted block">{p.why}</span></td><td>{p.room}</td><td><Pw p={p.power} /></td></tr>)}
                  <tr><td>Hub: {LAYOUT.hub.spot}</td><td>{LAYOUT.hub.room}</td><td><Pw p="wired" /></td></tr>
                </tbody>
              </table>
              <p className="small"><b>Rule:</b> one leak sensor per wet point with concealed plumbing on the monitored floor, one crack monitor per crack the inspector chooses to monitor at handover, one hub per home. This home: {LAYOUT.wetPoints.length} leak sensors + {LAYOUT.crackPoints.length} crack monitor + 1 hub = {LAYOUT.wetPoints.length + LAYOUT.crackPoints.length + 1} ESP32 boards.</p>
              <p className="xs muted">The prototype models the ground floor. Upstairs wet points (Bathroom 2) would add one leak node each under the same rule.</p>
            </div>
            <div className="panel panel-pad">
              <h3>What each sensor can and cannot tell</h3>
              <dl className="kv small">
                <dt>Leak sensor</dt><dd>Water bridging its contacts. It cannot find the source of a leak or water it does not touch. No AI: a threshold on the reading.</dd>
                <dt>Crack monitor</dt><dd>Movement across one crack, relative to the baseline set when it was fitted. It does not measure crack width in absolute terms, judge cause or decide safety.</dd>
                <dt>Hub</dt><dd>Whether each node is reporting. A silent node shows as offline in both apps.</dd>
              </dl>
            </div>
          </div>
        </section>

        <section id="principle" className="sys-sec">
          <h2>How the crack monitor works</h2>
          <CrackPrinciple />
        </section>

        <section id="wiring" className="sys-sec">
          <h2>Wiring</h2>
          <div className="sys-grid2">
            <figure className="panel panel-pad"><WiringLeak /><figcaption className="small"><b>Leak node, wired</b> (kitchen, laundry). Adapter into a 13 A socket, USB to the ESP32. Sensor signal to GPIO34, an ADC1 pin that still reads while Wi-Fi is on.</figcaption></figure>
            <figure className="panel panel-pad"><WiringCrack /><figcaption className="small"><b>Crack node, battery</b> (window W3; the basin node is the same with the water sensor). 18650 shield 5 V out to VIN. Hall sensor A0 to GPIO35. The magnet is fixed on the other side of the crack.</figcaption></figure>
          </div>
          <p className="xs muted">Low voltage only (5 V and 3.3 V). Nothing connects to the house wiring; the adapter plugs into an existing socket. Diagrams show the prototype boards, not a certified installation.</p>
        </section>

        <section id="power" className="sys-sec">
          <h2>Battery or wired</h2>
          <BatteryVsWired />
        </section>

        <section id="ai" className="sys-sec">
          <h2>Where rules end and AI starts</h2>
          <AiPipeline />
        </section>

        <section id="cost" className="sys-sec">
          <h2>Prototype bill of materials for one home</h2>
          <div className="notice t-warn small"><div><b>This is the cost of prototype-grade parts, not of a real installation.</b> These are hobbyist boards and modules for demonstrating the concept. A real installation in a resident's home would need sensors rated for wet areas and long-term use, a certified installer, calibration of each crack monitor, and a hosted backend. Those costs are not published, so they are marked Quotation required.</div></div>
          <p className="small muted">Prices from the retailer pages linked, checked {CHECKED}, quantity 1 pricing, excluding delivery. They are not quotations and may change.</p>
          <div className="panel sys-scroll">
            <table className="sys-table bom">
              <thead><tr><th>Component</th><th>Model</th><th className="r">Unit</th><th className="r">Qty</th><th className="r">Subtotal</th><th>Power</th><th>Wiring</th><th>Location</th><th>Purpose</th><th>Source</th></tr></thead>
              <tbody>
                {CATS.map(([k, name]) => [
                  <tr key={k} className="cat"><td colSpan="10">{name}</td></tr>,
                  ...BOM.filter((b) => b.cat === k).map((b) => (
                    <tr key={b.item}>
                      <td><b>{b.item}</b></td><td>{b.model}</td><td className="r num">{rm(b.price)}</td><td className="r num">{b.qty}</td><td className="r num">{rm(b.price * b.qty)}</td>
                      <td>{b.power}</td><td>{b.wiring}</td><td>{b.where}</td><td>{b.purpose}</td>
                      <td><a href={b.url} target="_blank" rel="noreferrer">{b.src.split(' (')[0]}</a><span className="xs muted block">checked {CHECKED}</span></td>
                    </tr>
                  )),
                ])}
              </tbody>
            </table>
          </div>
          <div className="sys-grid2">
            <div className="panel panel-pad">
              <h3>Totals</h3>
              <table className="sys-table totals">
                <tbody>
                  {CATS.map(([k, name]) => <tr key={k}><td>{name}</td><td className="r num">{rm(t.by[k])}</td></tr>)}
                  <tr><td>Installation and calibration</td><td className="r">Quotation required</td></tr>
                  <tr><td>Software and hosting (prototype)</td><td className="r num">RM0.00</td></tr>
                  <tr className="sum"><td>Prototype hardware total, per house</td><td className="r num">{rm(t.total)}</td></tr>
                  <tr><td>Per monitored location ({t.locations}: {LAYOUT.wetPoints.length} leak + {LAYOUT.crackPoints.length} crack)</td><td className="r num">{rm(t.perLocation)}</td></tr>
                </tbody>
              </table>
              <p className="xs muted">Per location = hardware total ÷ monitored points; the hub is shared across them. Installation, a pilot backend, delivery and pilot-grade sensors are not included, so this is not the price of fitting SIAGA in a real home.</p>
            </div>
            <div className="panel panel-pad">
              <h3>Not priced here</h3>
              <ul className="sys-list small">{NOT_PRICED.map((n) => <li key={n.item}><b>{n.item}.</b> {n.note}</li>)}</ul>
              <h3>Pilot upgrade with a published price</h3>
              <p className="small"><b>{UPGRADE.item}</b>: {rm(UPGRADE.price)} from <a href={UPGRADE.url} target="_blank" rel="noreferrer">{UPGRADE.src}</a>, checked {CHECKED}. {UPGRADE.note}</p>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}

const Pw = ({ p }) => <span className={'pw pw-' + p}>{p === 'wired' ? 'Wired 5 V' : 'Battery'}</span>;

function FlowDiagram() {
  const nodes = [['Sensors', 'Leak ×3, crack ×1'], ['ESP32 nodes', 'Read and send'], ['Hub', 'Wi-Fi, online check'], ['SIAGA service', 'Rules, records'], ['Resident app', 'Alerts, requests'], ['Technician app', 'Work orders, inspections']];
  return (
    <ol className="sys-flow">
      {nodes.map(([a, b], i) => <li key={a} style={{ animationDelay: i * 0.35 + 's' }}><b>{a}</b><span>{b}</span></li>)}
    </ol>
  );
}

// Animated schematic: as the crack opens, the magnet moves away from the Hall sensor and the signal falls.
function CrackPrinciple() {
  const [mm, setMm] = useState(0);
  const [play, setPlay] = useState(true);
  useEffect(() => {
    if (!play) return undefined;
    const t0 = performance.now();
    const id = setInterval(() => { const k = ((performance.now() - t0) / 5000) % 2; setMm(+(k < 1 ? k : 2 - k).toFixed(3)); }, 60);
    return () => clearInterval(id);
  }, [play]);
  const gap = 4 + mm * 22; // drawing units
  const sig = 1 / Math.pow(1 + mm * 1.6, 3); // schematic falloff, not a calibration
  return (
    <div className="sys-grid2">
      <div className="panel panel-pad">
        <svg viewBox="0 0 320 170" className="sys-svg" role="img" aria-label={`Crack opened ${mm.toFixed(2)} mm`}>
          <rect x="10" y="20" width={150 - gap / 2} height="120" className="wall" />
          <rect x={160 + gap / 2} y="20" width={150 - gap / 2} height="120" className="wall" />
          <path d={`M${160 - gap / 2} 20 L${160 - gap / 2} 140`} className="crack-edge" />
          <path d={`M${160 + gap / 2} 20 L${160 + gap / 2} 140`} className="crack-edge" />
          <rect x={110 - 0} y="64" width="40" height="32" rx="3" className="sensor" />
          <text x="130" y="84" textAnchor="middle" className="lbl w">Hall</text>
          <rect x={170 + gap / 2} y="68" width="22" height="24" rx="2" className="magnet" />
          <text x={181 + gap / 2} y="84" textAnchor="middle" className="lbl w">N</text>
          <path d={`M150 80 L${170 + gap / 2} 80`} className="dim" />
          <text x="160" y="160" textAnchor="middle" className="lbl">Gap grows with crack opening</text>
          <text x="85" y="14" textAnchor="middle" className="lbl">Fixed side</text>
          <text x="240" y="14" textAnchor="middle" className="lbl">Moving side</text>
        </svg>
        <div className="sys-meter">
          <span className="small">Opening since baseline <b className="num">{mm.toFixed(2)} mm</b></span>
          <span className="small">Relative signal <b className="num">{(sig * 100).toFixed(0)}%</b></span>
          <div className="bar"><i style={{ width: sig * 100 + '%' }} /></div>
        </div>
        <button type="button" className="linkbtn" onClick={() => setPlay(!play)}>{play ? 'Pause' : 'Play'}</button>
      </div>
      <div className="panel panel-pad">
        <h3>Principle</h3>
        <p className="small">A magnet is fixed on one side of the crack and a linear Hall-effect sensor on the other. When the crack opens or closes, the distance between them changes, and so does the magnetic field the sensor reads. The ESP32 records the reading against the baseline taken when the monitor was fitted, so SIAGA reports movement since handover, not width.</p>
        <h3>Limitations</h3>
        <ul className="sys-list small">
          <li>Needs a per-device calibration (reading against known shims) before readings mean millimetres. The demo values are simulated.</li>
          <li>The field falls off non-linearly with distance, so resolution is best near the fitted position.</li>
          <li>Temperature and nearby steel affect the reading; a reference reading or a displacement sensor (pilot upgrade on the costs table) reduces this.</li>
          <li>Measures one direction of movement at one point. It cannot see the rest of the wall.</li>
          <li>It flags change. Whether the change matters is decided by a technician or engineer on site.</li>
        </ul>
        <p className="xs muted">The drawing and signal curve are schematic, for explanation only.</p>
      </div>
    </div>
  );
}

function Esp({ x, y, pins }) {
  return (
    <g>
      <rect x={x} y={y} width="110" height={pins.length * 22 + 26} rx="5" className="esp" />
      <text x={x + 55} y={y + 17} textAnchor="middle" className="lbl w b">ESP32</text>
      {pins.map((p, i) => <g key={p}><circle cx={x + 110} cy={y + 34 + i * 22} r="3.5" className="pin" /><text x={x + 102} y={y + 38 + i * 22} textAnchor="end" className="lbl w">{p}</text></g>)}
    </g>
  );
}
function Wire({ d, c }) { return <path d={d} className={'wire ' + c} />; }

function WiringLeak() {
  return (
    <svg viewBox="0 0 360 200" className="sys-svg" role="img" aria-label="Leak node wiring: 5 V adapter to ESP32 USB; water sensor VCC to 3V3, GND to GND, signal to GPIO34">
      <rect x="6" y="20" width="70" height="44" rx="5" className="adapter" /><text x="41" y="40" textAnchor="middle" className="lbl w">5 V 2 A</text><text x="41" y="54" textAnchor="middle" className="lbl w">adapter</text>
      <Wire d="M76 42 C100 42 100 70 120 70" c="usb" /><text x="80" y="76" className="lbl">USB</text>
      <Esp x={120} y={40} pins={['3V3', 'GND', 'GPIO34']} />
      <rect x="282" y="58" width="70" height="86" rx="4" className="sensorpcb" /><text x="317" y="76" textAnchor="middle" className="lbl w">Water</text><text x="317" y="90" textAnchor="middle" className="lbl w">sensor</text>
      {[0, 1, 2].map((i) => <path key={i} d={`M292 ${102 + i * 13} h50`} className="trace" />)}
      <Wire d="M230 74 C255 74 255 66 282 66" c="red" /><Wire d="M230 96 C255 96 255 80 282 80" c="black" /><Wire d="M230 118 C255 118 255 96 282 96" c="sig" />
      <text x="248" y="62" className="lbl">VCC</text><text x="250" y="130" className="lbl">S</text>
      <text x="175" y="190" textAnchor="middle" className="lbl muted">Sensor sits flat on the cabinet base, contacts facing down</text>
    </svg>
  );
}
function WiringCrack() {
  return (
    <svg viewBox="0 0 384 200" className="sys-svg" role="img" aria-label="Crack node wiring: 18650 shield 5 V to ESP32 VIN; Hall sensor plus to 3V3, G to GND, A0 to GPIO35; magnet across the crack">
      <rect x="6" y="14" width="80" height="58" rx="5" className="adapter batt" /><text x="46" y="36" textAnchor="middle" className="lbl w">18650</text><text x="46" y="50" textAnchor="middle" className="lbl w">shield</text><text x="46" y="64" textAnchor="middle" className="lbl w">5 V out</text>
      <Wire d="M86 34 C104 34 104 140 230 140" c="red" /><Wire d="M86 56 C100 56 100 96 230 96" c="black" />
      <Esp x={120} y={40} pins={['3V3', 'GND', 'GPIO35', 'VIN']} />
      <rect x="276" y="56" width="58" height="60" rx="4" className="sensorpcb" /><text x="305" y="80" textAnchor="middle" className="lbl w">KY-024</text><text x="305" y="94" textAnchor="middle" className="lbl w">Hall</text>
      <Wire d="M230 74 C252 74 252 66 276 66" c="red" /><Wire d="M230 96 C252 96 252 84 276 84" c="black" /><Wire d="M230 118 C252 118 252 102 276 102" c="sig" />
      <text x="248" y="58" className="lbl">+</text><text x="246" y="126" className="lbl">A0</text>
      <path d="M340 40 L346 70 L338 100 L348 130 L342 160" className="crackline" />
      <rect x="348" y="76" width="10" height="20" className="magnet" />
      <text x="300" y="175" textAnchor="middle" className="lbl muted">Magnet across the crack</text>
    </svg>
  );
}

function BatteryVsWired() {
  const [cap, setCap] = useState(2600);
  const [cur, setCur] = useState(5);
  const usable = 0.8;
  const hours = (cap * usable) / Math.max(0.01, cur);
  return (
    <div className="sys-grid2">
      <div className="panel panel-pad">
        <table className="sys-table">
          <thead><tr><th /><th>Wired 5 V</th><th>Battery (18650)</th></tr></thead>
          <tbody>
            <tr><td>Where</td><td>A socket within reach: kitchen, laundry, hub</td><td>No socket: basin, window W3</td></tr>
            <tr><td>Reporting</td><td>Continuous</td><td>Wakes, reads, sends, sleeps</td></tr>
            <tr><td>Upkeep</td><td>None after fitting</td><td>Recharge; the app shows the level</td></tr>
            <tr><td>Install</td><td>Adapter lead to tidy</td><td>No cable runs</td></tr>
            <tr><td>Risk</td><td>Lead unplugged by mistake</td><td>Flat battery; offline alert covers both</td></tr>
          </tbody>
        </table>
        <p className="small"><b>Choice:</b> wired wherever a socket exists; battery only where there is none, and only after the node's current is measured.</p>
      </div>
      <div className="panel panel-pad">
        <h3>Battery life: calculate, don't guess</h3>
        <p className="small">Life (hours) = capacity (mAh) × usable fraction ÷ average current (mA)</p>
        <div className="sys-calc">
          <label className="small">Capacity, mAh<input type="number" value={cap} min="100" step="100" onChange={(e) => setCap(Number(e.target.value) || 0)} /></label>
          <label className="small">Average current, mA<input type="number" value={cur} min="0.01" step="0.5" onChange={(e) => setCur(Number(e.target.value) || 0)} /></label>
        </div>
        <p className="small num">{cap} × {usable} ÷ {cur} = <b>{hours.toFixed(0)} h</b> ≈ <b>{(hours / 24).toFixed(1)} days</b></p>
        <table className="sys-table small">
          <thead><tr><th>If the measured average is</th><th className="r">Life with a 2600 mAh cell</th></tr></thead>
          <tbody>{[1, 5, 20].map((i) => <tr key={i}><td>{i} mA</td><td className="r num">{(2600 * usable / i / 24).toFixed(1)} days</td></tr>)}</tbody>
        </table>
        <p className="xs muted">We have not measured our nodes yet, so we make no battery-life claim. A development board's regulator and USB chip draw current even in deep sleep; a pilot would measure with a multimeter and likely use a bare ESP32 module.</p>
      </div>
    </div>
  );
}

function AiPipeline() {
  const L = (a, b, k) => <li className={k}><b>{a}</b><span>{b}</span></li>;
  return (
    <div className="sys-grid2">
      <div className="panel panel-pad">
        <h3>Sensors: rules only</h3>
        <ol className="sys-pipe">
          {L('Reading', 'Leak contact, or crack movement against baseline', 'rule')}
          {L('Threshold', 'Wet, or movement above the limit set at handover', 'rule')}
          {L('Anomaly flag', '"Potential", never "confirmed"', 'rule')}
          {L('Alert and work order', 'Resident told; technician gets the evidence', 'rule')}
          {L('Technician decides', 'Inspection on site confirms or rules out', 'human')}
        </ol>
      </div>
      <div className="panel panel-pad">
        <h3>Photo check: one model, then rules</h3>
        <ol className="sys-pipe">
          {L('Photo', 'Taken by the resident, stays on the phone', 'rule')}
          {L('YOLOv8n, on the phone', 'Labels the crack pattern: Horizontal, Vertical, Diagonal or Hairline', 'ai')}
          {L('Confidence rule', `≥ ${CONF_SHOW}: show the label · ${CONF_MIN}–${CONF_SHOW}: ask for a retake · below: no label`, 'rule')}
          {L('Guidance', 'Fixed text for the pattern, plus warning signs the resident ticks', 'rule')}
          {L('Resident sends, technician checks', 'Technician agrees or disagrees with the label on site', 'human')}
        </ol>
        <p className="xs muted">The model never judges safety, cause, width or severity. Test-set result: 0.72 mAP50 overall.</p>
      </div>
      <p className="sys-key small"><span className="k ai">Machine learning</span><span className="k rule">Fixed rules</span><span className="k human">People</span></p>
    </div>
  );
}
