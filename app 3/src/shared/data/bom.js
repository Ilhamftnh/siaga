// Bill of materials for one monitored home (the demo layout), with Malaysian retail prices.
// Prices were read from the retailer pages listed, on the date below. They exclude delivery and
// may change. Nothing here is a quotation. Items without a published price say "Quotation required".

export const CHECKED = '19 Oct 2026';
const SYN = 'Synacorp Technologies (synacorp.my)';

// Quantities come from the house layout: one leak sensor per wet point with concealed plumbing
// on the monitored floor, one crack monitor per crack the inspector chooses to monitor, one hub.
export const LAYOUT = {
  wetPoints: [
    { room: 'Kitchen', spot: 'Under the sink', power: 'wired', why: 'Concealed waste and supply pipes in a closed cabinet; socket in the cabinet line' },
    { room: 'Bathroom', spot: 'Basin plumbing', power: 'battery', why: 'Wet zone: no socket near the basin, so battery' },
    { room: 'Laundry', spot: 'Behind the washer', power: 'wired', why: 'Washer inlet and drain hoses; washer socket next to it' },
  ],
  crackPoints: [
    { room: 'Living and dining', spot: 'Window W3, lower corner', power: 'battery', why: 'Recorded at the handover inspection and chosen for monitoring; no socket at the window' },
  ],
  hub: { room: 'Stairs and hall', spot: 'Next to the DB box', power: 'wired' },
};

export const CATS = [
  ['sensors', 'Sensors'],
  ['control', 'Controllers and communication'],
  ['power', 'Power and batteries'],
  ['wiring', 'Wiring and enclosures'],
];

export const BOM = [
  { cat: 'sensors', item: 'Water / liquid level sensor module', model: 'Generic module, SKU B22-WLSM (3–5 V, analogue output)', maker: 'Generic', price: 2.5, qty: 3, power: '3.3 V from the ESP32', wiring: 'VCC, GND, signal to GPIO34', where: 'Kitchen sink, basin, laundry', purpose: 'Detects water on the floor or cabinet base (contact sensor, no AI)', src: SYN, url: 'https://synacorp.my/v3/en/sensors/111-water-liquid-level-sensor-module.html' },
  { cat: 'sensors', item: 'Linear Hall-effect sensor module', model: 'KY-024, 49E linear Hall sensor, SKU B21-KY024', maker: 'Generic', price: 4.5, qty: 1, power: '3.3 V from the ESP32', wiring: '+, G, A0 to GPIO35', where: 'Window W3, one side of the crack', purpose: 'Prototype crack monitor: reads the field of a magnet fixed across the crack', src: SYN, url: 'https://synacorp.my/v3/en/sensors/70-ky-024-linear-magnetic-hall-effect-sensor-ky024.html' },
  { cat: 'sensors', item: 'Neodymium disc magnet', model: 'N35 round, solid (listed from RM1.00; size sets the price)', maker: 'Generic', price: 1.0, qty: 1, power: 'None', wiring: 'None', where: 'Window W3, other side of the crack', purpose: 'Moves with the wall; the sensor reads the change', src: SYN, url: 'https://synacorp.my/v3/en/round-magnets/3132-2207-n35-round-solid-ndfeb-super-strong-disc-neodymium-magnet.html' },
  { cat: 'control', item: 'ESP32 development board', model: 'NodeMCU ESP32 30-pin, SKU B11-ESP32-30P', maker: 'Espressif ESP32 on a generic board', price: 27.9, qty: 5, power: '5 V (USB or VIN)', wiring: 'Reads one sensor; Wi-Fi to the hub', where: '3 leak nodes, 1 crack node, 1 hub', purpose: 'Reads the sensor and sends readings over Wi-Fi', src: SYN, url: 'https://synacorp.my/v3/en/nodemcu-esp/1839-2459-nodemcu-esp32-30p-iot-wifi-bluetooth-development-board-esp-32.html' },
  { cat: 'power', item: '5 V 2 A adapter', model: 'Adapter 5V/2A with micro-USB (listed on sale)', maker: 'Generic', price: 10.8, qty: 3, power: '240 V AC in, 5 V DC out', wiring: 'Plugs into a socket, USB to the ESP32', where: 'Hub, kitchen node, laundry node', purpose: 'Mains power for wired nodes', src: SYN, url: 'https://synacorp.my/v3/en/adapters/688-2452-adapter-5v-2a-charger-c-w-dcplug-microusb.html' },
  { cat: 'power', item: '18650 Li-ion cell', model: '3.7 V 2600 mAh, flat top', maker: 'Generic', price: 9.9, qty: 2, power: '3.7 V nominal', wiring: 'In the battery shield', where: 'Basin node, crack node', purpose: 'Battery power where there is no socket', src: SYN, url: 'https://synacorp.my/v3/en/home/3831-37v-2600mah-18650-5c-rechargeable-li-ion-battery-flat-top.html' },
  { cat: 'power', item: '18650 battery shield', model: 'Single 18650 holder, charger and 5 V / 3.3 V output board', maker: 'Generic', price: 9.9, qty: 2, power: 'Charges by USB; 5 V out', wiring: '5 V out to ESP32 VIN, GND to GND', where: 'Basin node, crack node', purpose: 'Holds and charges the cell, steps up to 5 V', src: SYN, url: 'https://synacorp.my/v3/en/power-sockets/3123-2118-18650-37v-li-ion-battery-shield-holder-charger-expansion-development-board-module-.html' },
  { cat: 'wiring', item: 'Plastic enclosure', model: 'Grey ABS box 120 × 80 × 40 mm', maker: 'Generic', price: 5.9, qty: 5, power: 'None', wiring: 'Cable gland holes drilled on site', where: 'One per node and the hub', purpose: 'Protects the board from splashes and touch', src: SYN, url: 'https://synacorp.my/v3/en/enclosures/2366-plastic-box-120x80x40mm-grey.html' },
  { cat: 'wiring', item: 'Jumper wires, male to female, 20 cm', model: 'Pack of 10', maker: 'Generic', price: 1.1, qty: 2, power: 'None', wiring: 'Sensor to ESP32', where: 'All nodes', purpose: 'Prototype connections (a pilot would use soldered or crimped leads)', src: SYN, url: 'https://synacorp.my/v3/en/jumper-wires/273-20cm-male-to-female-breadboard-jumper-wire-10pcs.html' },
];

export const NOT_PRICED = [
  { item: 'Installation and calibration', note: 'Fixing nodes, running adapter leads, setting the crack sensor zero and testing each node at handover. Labour rate not published: Quotation required.' },
  { item: 'Cloud hosting and backend for a pilot', note: 'The prototype runs in the browser with no server (RM0). A pilot needs a database, push notifications and accounts: Quotation required from the chosen provider.' },
  { item: 'Building-grade crack monitor (pilot)', note: 'Commercial crackmeters: Quotation required from a supplier.' },
];

// A real alternative for a pilot, with a published Malaysian price
export const UPGRADE = { item: 'Vishay RE20LR2A502WS linear position sensor, 0–10 mm, 5 kΩ', price: 248.57, src: 'element14 Malaysia (order code 4840984)', url: 'https://my.element14.com/c/sensors-transducers/sensors/motion-sensors-position-sensors/linear-displacement-sensors', note: 'Replaces the Hall sensor and magnet with a direct displacement reading. Unit price for quantity 1 as listed.' };

export const totals = () => {
  const by = Object.fromEntries(CATS.map(([k]) => [k, 0]));
  BOM.forEach((b) => { by[b.cat] += b.price * b.qty; });
  const total = Object.values(by).reduce((a, b) => a + b, 0);
  const locations = LAYOUT.wetPoints.length + LAYOUT.crackPoints.length;
  return { by, total, locations, perLocation: total / locations };
};
export const rm = (v) => 'RM' + v.toFixed(2);
