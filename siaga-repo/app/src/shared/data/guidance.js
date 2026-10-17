// Rule-based guidance for each crack pattern the AI can label.
// This is not a second AI model. Text is general information, not a diagnosis.

export const CLASSES = ['Horizontal', 'Vertical', 'Diagonal', 'Hairline'];

// Display rules for model confidence (set by the team, adjust after testing)
export const CONF_SHOW = 0.5;   // at or above: show the label
export const CONF_MIN = 0.25;   // between MIN and SHOW: "not sure, retake"

export const GUIDANCE = {
  Horizontal: {
    what: 'A crack running mostly side to side across the wall.',
    causes: [
      'Movement where the wall meets a beam, slab or a different material',
      'Shrinkage of plaster or render as it dries',
      'Pressure on the wall from soil or loads (needs a professional to judge)',
    ],
    next: 'Photograph it again in two to four weeks from the same spot. Ask for an inspection if it grows or any warning sign applies.',
  },
  Vertical: {
    what: 'A crack running mostly up and down the wall.',
    causes: [
      'Shrinkage of plaster, render or blockwork as materials dry',
      'A joint between two materials, such as a column and brick wall',
      'Ground or foundation movement (needs a professional to judge)',
    ],
    next: 'Photograph it again in two to four weeks from the same spot. Ask for an inspection if it grows or any warning sign applies.',
  },
  Diagonal: {
    what: 'A crack running at an angle, often from the corner of a window or door.',
    causes: [
      'Stress concentrating at the corners of openings',
      'Movement of the support above a window or door',
      'Uneven ground settlement (needs a professional to judge)',
    ],
    next: 'Diagonal cracks at openings are worth a professional look, even when narrow. Submitting a report lets an inspector decide.',
  },
  Hairline: {
    what: 'A very fine crack in the surface, often in paint or plaster.',
    causes: [
      'Shrinkage of paint, skim coat or plaster',
      'Small temperature movement',
      'The surface sign of a deeper crack (cannot be ruled out from a photo)',
    ],
    next: 'Many hairline cracks are cosmetic, but a photo cannot confirm this. Watch it, and ask for an inspection if it lengthens, widens or comes with damp.',
  },
};

// Shared warning signs. Ticking any of them recommends prompt professional assessment.
export const WARNING_SIGNS = [
  'It is getting longer or wider',
  'It is wider at one end than the other',
  'A door or window near it has started sticking',
  'There is damp, staining or water near it',
  'It came back after being repaired',
  'It can be seen on both sides of the wall',
];

// Indicative costs. Only figures from a published source are shown; everything else is "Quotation required".
export const COSTS = {
  inspection: { label: 'Professional inspection', value: 'Quotation required', source: null },
  injection: {
    label: 'Crack repair by epoxy injection (if a professional confirms it is suitable)',
    value: 'RM150–400 per crack',
    source: 'Indicative 2026 Klang Valley market range, ClickBina waterproofing cost guide (updated 24 May 2026)',
  },
  other: { label: 'Other repairs (structural, re-plastering, repainting)', value: 'Quotation required', source: null },
};

export const LEAK_GUIDANCE = {
  what: 'Water has reached the sensor at this spot.',
  doNow: [
    'Check the area and wipe up any water',
    'If water is still coming, close the tap or isolation valve under the sink',
    'Keep electrical appliances away from the water',
  ],
  limit: 'The sensor only knows that water reached this exact spot. It cannot see hidden leaks elsewhere in the house.',
  cost: 'Quotation required',
};
