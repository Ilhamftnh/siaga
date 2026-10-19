import { useState } from 'react';
import { CLASSES, CONF_SHOW, CONF_MIN, GUIDANCE, WARNING_SIGNS, COSTS } from '../../shared/data/guidance.js';
import { detect, modelStatus } from '../../shared/services/crackModel.js';
import { makeSample, shrink, loadImage } from '../../shared/data/samplePhotos.js';
import Icon from '../shared/Icon.jsx';
import { Button, Dialog } from '../shared/ui.jsx';
import { AiPhoto } from '../shared/visuals.jsx';

function verdict(top, sample) {
  if (sample) return { kind: 'sample', label: top.label };
  if (!top || top.conf < CONF_MIN) return { kind: 'none' };
  if (top.conf < CONF_SHOW) return { kind: 'unsure', label: top.label, conf: top.conf };
  return { kind: 'ok', label: top.label, conf: top.conf };
}

// Takes a photo, runs the trained YOLOv8n model in the browser, and shows rule-based guidance.
// value: { photo, boxes, v, signs } ; onChange(value)
export default function CrackCheck({ value, onChange, error }) {
  const [busy, setBusy] = useState(false);
  const [samples, setSamples] = useState(false);
  const ms = modelStatus().status;

  async function run(src, sample) {
    setBusy(true);
    try {
      const img = await loadImage(src);
      const small = shrink(img, 760);
      const photo = { src: small.src, w: small.w, h: small.h };
      let boxes = [], v;
      if (sample) {
        const b = sample.box, k = small.w / sample.w;
        boxes = [{ x: b.x * k, y: b.y * k, w: b.w * k, h: b.h * k, label: sample.kind, conf: null }];
        v = verdict({ label: sample.kind }, true);
      } else if (modelStatus().status === 'ready') {
        const raw = await detect(img, CONF_MIN);
        boxes = raw.map((b) => ({ ...b, x: b.x * small.scale, y: b.y * small.scale, w: b.w * small.scale, h: b.h * small.scale }));
        v = verdict(boxes[0]);
      } else v = { kind: 'nomodel' };
      onChange({ ...value, photo, boxes, v });
    } catch (e) {
      onChange({ ...value, photo: null, boxes: [], v: { kind: 'error', msg: String(e.message || e) } });
    }
    setBusy(false);
  }
  function onFile(e) {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    const rd = new FileReader();
    rd.onload = () => run(rd.result, null);
    rd.readAsDataURL(f);
    e.target.value = '';
  }
  const toggleSign = (s) => onChange({ ...value, signs: value.signs.includes(s) ? value.signs.filter((x) => x !== s) : [...value.signs, s] });

  const v = value.v;
  const g = v && v.label && (v.kind === 'ok' || v.kind === 'sample') ? GUIDANCE[v.label] : null;
  const shown = v && (v.kind === 'ok' || v.kind === 'unsure' || v.kind === 'sample') ? value.boxes.slice(0, 1) : [];

  return (
    <div className="crackcheck">
      <div className={'field' + (error ? ' has-error' : '')}>
        <span className="field-label">Photo of the crack</span>
        <p className="field-hint">Stand about an arm's length away, square to the wall, in good light.</p>
        {value.photo ? (
          <AiPhoto src={value.photo.src} boxes={shown} w={value.photo.w} h={value.photo.h} />
        ) : (
          <div className="photo-empty"><Icon name="camera" size={26} /><span>No photo yet</span></div>
        )}
        <div className="btnrow">
          <label className="btn btn-primary btn-sm filebtn">
            <Icon name="camera" size={16} />{value.photo ? 'Retake photo' : 'Take or upload a photo'}
            <input type="file" accept="image/*" capture="environment" onChange={onFile} className="sr" />
          </label>
          <Button size="sm" onClick={() => setSamples(true)}>Use a sample</Button>
        </div>
        {error && <p className="field-error" role="alert"><Icon name="alert" size={14} />{error}</p>}
        <p className="xs muted">{ms === 'ready' ? 'Crack model ready. It runs on this device; the photo is only sent if you send the request.' : ms === 'loading' || ms === 'unchecked' ? 'Loading the crack model…' : 'The crack model is not available in this build. You can still send the photo.'}</p>
      </div>

      {busy && <div className="ai-result" aria-live="polite"><div className="spinner" />Checking the photo…</div>}

      {!busy && v && (
        <div className="ai-result" aria-live="polite">
          {v.kind === 'ok' && <><p className="ai-label">{v.label} crack</p><p className="small muted">Model confidence {v.conf.toFixed(2)}</p></>}
          {v.kind === 'sample' && <><p className="ai-label">{v.label} crack</p><p className="small t-warn-text">Sample illustration. This is not a result from the trained model.</p></>}
          {v.kind === 'unsure' && <><p className="ai-label">Not sure</p><p className="small">The model's best guess is {v.label.toLowerCase()} ({v.conf.toFixed(2)}), which is too low to rely on. Retake the photo closer and square to the wall, or send it as it is.</p></>}
          {v.kind === 'none' && <><p className="ai-label">No crack pattern found</p><p className="small">If you can see a crack, retake the photo closer to it. You can also send the request without an AI label.</p></>}
          {v.kind === 'nomodel' && <p className="small">The crack model isn't loaded, so there's no AI label. The technician will look at your photo.</p>}
          {v.kind === 'error' && <p className="small">The photo couldn't be checked ({v.msg}). Try another photo.</p>}
          <p className="xs muted ai-limit">The AI only recognises the pattern of a crack. It cannot tell the cause, the width, or whether the wall is safe.</p>
          {g && (
            <details className="guide">
              <summary>What a {v.label.toLowerCase()} crack usually means</summary>
              <p>{g.what}</p>
              <p className="small"><b>Possible causes</b></p>
              <ul className="tight small">{g.causes.map((c) => <li key={c}>{c}</li>)}</ul>
              <p className="small"><b>Suggested next step:</b> {g.next}</p>
            </details>
          )}
        </div>
      )}

      <fieldset className="field signs">
        <legend className="field-label">Do any of these apply?</legend>
        <p className="field-hint">Tick any you have noticed. They help the technician decide how soon to visit.</p>
        <div className="panel">
          {WARNING_SIGNS.map((s) => (
            <label key={s} className="choice"><input type="checkbox" checked={value.signs.includes(s)} onChange={() => toggleSign(s)} /><b>{s}</b></label>
          ))}
        </div>
        {value.signs.length > 0 && (
          <div className="notice t-warn"><Icon name="alert" /><div><b>A professional should look at this soon.</b>Your request will be marked high priority.</div></div>
        )}
      </fieldset>

      <details className="guide costs">
        <summary>What repairs usually cost</summary>
        <ul className="rows">
          {Object.values(COSTS).map((c) => (
            <li key={c.label} className="row"><span className="row-main small">{c.label}{c.source && <span className="row-sub">Source: {c.source}</span>}</span><b className="small">{c.value}</b></li>
          ))}
        </ul>
        <p className="xs muted">Defects reported within the defect liability period are handled by the developer. Ask your technician what applies.</p>
      </details>

      <Dialog open={samples} title="Use a sample illustration" onClose={() => setSamples(false)}>
        <p className="small muted">For demos without a crack to photograph. Sample results are labelled and never shown as model output.</p>
        <div className="sample-grid">
          {CLASSES.map((k) => (
            <button key={k} type="button" className="sample" onClick={() => { setSamples(false); const s = makeSample(k); run(s.src, s); }}>{k}</button>
          ))}
        </div>
      </Dialog>
    </div>
  );
}
