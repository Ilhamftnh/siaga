# SIAGA: AI-Powered Wall Crack Detection & IoT-Based Property Defect Monitoring

**Detect early. Monitor smarter. Live safer.**
Sime Darby Property University Hackathon 2026 – Township of Tomorrow (theme: People)

SIAGA helps homeowners in new townships spot and report wall cracks and water leaks early. Technicians handle each case through a clear workflow. It is proposed as an enhancement to the Sime Darby Property App and is not affiliated with or endorsed by Sime Darby Property.

## Three connected prototypes

| Route | Product | Who it is for |
|---|---|---|
| `#/house` | **House prototype**: 3D two-storey terrace home with three leak sensors, a crack monitor point at window W3 and a hub | Demonstration rig; stands in for the physical ESP32 model |
| `#/app/resident` | **Resident app**: Home, My House (floor plan), Devices, Maintenance, Notifications, Profile | Homeowner |
| `#/app/technician` | **Technician app**: Dashboard, Work orders, Inspections, Job history, Phase overview | Maintenance technician and property management |

The three products share one data layer (`src/shared/services/store.jsx`) but no screens. Open the house in one browser tab and an app in another: the tabs stay in sync through browser storage.

## What is real and what is simulated

| Part | Status |
|---|---|
| AI crack check (YOLOv8n, 4 patterns: Horizontal, Vertical, Diagonal, Hairline) | **Real.** The team's trained model runs in the browser on any uploaded or camera photo. |
| Guidance, warning-sign checklist, cost guidance | **Real, rule-based** (not AI). A price is shown only where it has a cited source; otherwise "Quotation required". |
| Maintenance requests, work-order workflow, notifications, inspections | **Working** in the browser with demo data. No backend. |
| Leak sensors, crack monitor, hub | **Simulated** from the house prototype. No hardware is connected. |
| Handover inspection, resident, technicians, other homes | **Sample data.** |
| Sync between devices (for example the house on a laptop and the app on a phone) | **Not supported.** Needs a backend; tabs in the same browser do sync. |
| Connection to the Sime Darby Property App | **Proposed only.** Not built. |

## Main flows to demo

1. **Leak:** in the house, press *Add water* under the kitchen sink. The resident app shows *Water detected* with guidance. The resident chooses *Request a plumber*; nothing is sent until they review and confirm.
2. **Work order:** in the technician app, the request appears as *New*. Assign it, schedule a visit (validated), start the job, add notes, then complete it with a summary (confirmation required). The resident sees each step and the summary.
3. **Crack:** in the resident app, *Check a wall crack* runs the AI on a photo, shows the pattern and guidance, and asks about warning signs (any ticked → high priority). The technician confirms whether the AI label matches, then can *Fit crack monitor* with an alert limit.
4. **Monitoring:** move the wall-movement slider in the house. Readings are recorded every 2 seconds. Passing the limit alerts the resident and raises the job to high priority.
5. **Inspection:** the technician records *No fault*, *Potential issue* or *Confirmed fault* for each device. Findings are added to the work order.
6. **Device faults:** switch a sensor or the hub off in the house. It shows as offline in both apps, and tests fail.

## AI model results

Model: YOLOv8n fine-tuned with Ultralytics, trained on the Roboflow "Building Crack Detection" dataset by Akash Roy (CC BY 4.0), filtered to 4 classes. Results below are on the dataset's held-out test split (247 images):

| Class | Precision | Recall | mAP50 |
|---|---|---|---|
| Horizontal | 0.775 | 0.759 | 0.847 |
| Vertical | 0.770 | 0.830 | 0.837 |
| Diagonal | 0.869 | 0.640 | 0.747 |
| Hairline | 0.644 | 0.400 | 0.456 |
| **All** | **0.765** | **0.657** | **0.722** |

Hairline is the weakest class. When confidence is below 0.5, the app says "Not sure" and asks for a retake instead of showing a label. The AI recognises the crack pattern only. It cannot judge structural safety, the cause or the width. A qualified professional makes every safety and repair decision.

## Run it

Requires Node.js 18 or newer.

```bash
cd app
npm install
npm run dev      # development server, usually http://localhost:5173
npm run build    # production build in app/dist
```

Deploying on Vercel: import the repo, set **Root Directory** to `app`, and keep the **Vite** preset.

## Testing checklist

- [ ] Each route loads: `#/`, `#/house`, `#/app/resident`, `#/app/technician`
- [ ] Leak in the house shows in the resident app and Notifications
- [ ] A resident request appears in the technician app as New
- [ ] Schedule visit rejects a past time; completion requires a summary
- [ ] The resident sees *Completed* with the technician's summary
- [ ] The crack check shows "Crack model ready" and labels an uploaded photo
- [ ] Fitting a monitor and moving the slider past the limit raises alerts
- [ ] Profile, then *Reset demo data*, restores the starting state

## Project structure

```
app/src/
  main.jsx                    routes: launcher, house, resident, technician
  Launcher.jsx
  house-prototype/            HousePrototype.jsx (sensor simulation), House3D.jsx (three.js model)
  application/
    resident/                 Home, MyHouse, Devices, Maintenance, CrackCheck, Notifications, Profile
    technician/               Dashboard, WorkOrders, WorkOrder (workflow), Inspections, History, Overview
    shared/                   UI components, icons, floor plan, chart, app shell
  shared/
    data/                     seed (sample data), guidance (rule-based text, costs), sample photos
    services/                 store (shared state + tab sync), router, crackModel (ONNX inference), format
  styles/                     base, app, resident, technician, house
app/public/model/best.onnx    trained crack model
```

## Credits

- Dataset: "Building Crack Detection" by Akash Roy, Roboflow Universe, CC BY 4.0.
- Libraries: Ultralytics YOLOv8, ONNX Runtime Web, React, Vite, three.js. Font: Inter.
