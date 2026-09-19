// Integrator comparison.
//
// The README claims semi-implicit Euler is the right choice for the grass
// springs. This measures it, using the same force law and the same k, c the
// page runs with.
//
//   node bench/integrator.mjs
//
// Writes docs/integrator-energy.svg and prints the stability sweep.

import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { GRASS_C, GRASS_K, STEP } from "../src/config.js";
import { energy, explicitStep, semiImplicitStep } from "../src/spring.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

/** Run one oscillator and sample total energy over time. */
function run(step, { k, c, dt, seconds, x0 = 1, v0 = 0 }) {
  const s = { x: x0, v: v0 };
  const e0 = energy(s, k);
  const steps = Math.round(seconds / dt);
  const samples = [];
  for (let i = 0; i <= steps; i++) {
    samples.push({ t: i * dt, e: energy(s, k) / e0 });
    step(s, k, c, dt);
    if (!Number.isFinite(s.x) || Math.abs(s.x) > 1e12) {
      samples.push({ t: (i + 1) * dt, e: Infinity });
      break;
    }
  }
  return samples;
}

function finalEnergy(samples) {
  const last = samples[samples.length - 1].e;
  return Number.isFinite(last) ? last : Infinity;
}

// ---------------------------------------------------------------- undamped
// With c = 0 the exact solution conserves energy, so any drift is the
// integrator's own error rather than physical damping.
const SECONDS = 4;
const undampedSemi = run(semiImplicitStep, { k: GRASS_K, c: 0, dt: STEP, seconds: SECONDS });
const undampedExpl = run(explicitStep, { k: GRASS_K, c: 0, dt: STEP, seconds: SECONDS });

// ------------------------------------------------------------------ damped
// The configuration the grass actually uses.
const dampedSemi = run(semiImplicitStep, { k: GRASS_K, c: GRASS_C, dt: STEP, seconds: SECONDS });
const dampedExpl = run(explicitStep, { k: GRASS_K, c: GRASS_C, dt: STEP, seconds: SECONDS });

console.log(`spring: k=${GRASS_K} c=${GRASS_C}  dt=1/${Math.round(1 / STEP)}s  t=${SECONDS}s\n`);
console.log("undamped (c=0), energy after 4s as a fraction of initial:");
console.log(`  semi-implicit   ${finalEnergy(undampedSemi).toFixed(4)}`);
console.log(`  explicit        ${finalEnergy(undampedExpl).toFixed(4)}`);
console.log("\ndamped (c=11), energy after 4s as a fraction of initial:");
console.log(`  semi-implicit   ${finalEnergy(dampedSemi).toExponential(3)}`);
console.log(`  explicit        ${finalEnergy(dampedExpl).toExponential(3)}`);

// -------------------------------------------------------- stability sweep
// How large a timestep each integrator survives before the oscillator diverges.
console.log("\nstability sweep (undamped, 4s), energy ratio — 'blew up' = diverged:");
console.log("  timestep      semi-implicit      explicit");
const rates = [480, 240, 120, 60, 30, 20, 15];
const sweep = [];
for (const hz of rates) {
  const dt = 1 / hz;
  const a = finalEnergy(run(semiImplicitStep, { k: GRASS_K, c: 0, dt, seconds: SECONDS }));
  const b = finalEnergy(run(explicitStep, { k: GRASS_K, c: 0, dt, seconds: SECONDS }));
  const fmt = (v) => (Number.isFinite(v) ? (v > 1e4 ? v.toExponential(2) : v.toFixed(3)) : "blew up");
  console.log(`  1/${String(hz).padEnd(4)} s      ${fmt(a).padEnd(18)} ${fmt(b)}`);
  sweep.push({ hz, semi: a, expl: b });
}

// ---------------------------------------------------------------- svg plot
function plot({ width = 780, height = 340, series, title, yMax }) {
  const pad = { l: 58, r: 176, t: 34, b: 42 };
  const iw = width - pad.l - pad.r;
  const ih = height - pad.t - pad.b;
  const x = (t) => pad.l + (t / SECONDS) * iw;
  const y = (e) => pad.t + ih - (Math.min(e, yMax) / yMax) * ih;

  // Stop the line at the first sample above the axis instead of clamping it,
  // otherwise a diverging curve draws a flat plateau along the top edge and
  // reads as if it stabilised.
  const path = (samples) => {
    const pts = [];
    for (const s of samples) {
      if (!Number.isFinite(s.e)) break;
      pts.push(s);
      if (s.e > yMax) break;
    }
    return pts.map((s, i) => `${i ? "L" : "M"}${x(s.t).toFixed(1)} ${y(s.e).toFixed(1)}`).join(" ");
  };

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((f) => f * yMax);
  const grid = yTicks
    .map(
      (v) =>
        `<line x1="${pad.l}" y1="${y(v).toFixed(1)}" x2="${pad.l + iw}" y2="${y(v).toFixed(1)}" stroke="#e3e6e1"/>` +
        `<text x="${pad.l - 10}" y="${(y(v) + 4).toFixed(1)}" text-anchor="end" font-size="11" fill="#6b7280">${v.toFixed(2)}</text>`,
    )
    .join("");

  const xTicks = [0, 1, 2, 3, 4]
    .map(
      (t) =>
        `<text x="${x(t).toFixed(1)}" y="${pad.t + ih + 20}" text-anchor="middle" font-size="11" fill="#6b7280">${t}s</text>`,
    )
    .join("");

  const lines = series
    .map((s) => `<path d="${path(s.samples)}" fill="none" stroke="${s.color}" stroke-width="2"/>`)
    .join("");

  const legend = series
    .map(
      (s, i) =>
        `<rect x="${pad.l + iw + 16}" y="${pad.t + 6 + i * 22}" width="12" height="3" fill="${s.color}"/>` +
        `<text x="${pad.l + iw + 34}" y="${pad.t + 13 + i * 22}" font-size="12" fill="#374151">${s.label}</text>`,
    )
    .join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" font-family="ui-sans-serif, system-ui, sans-serif">
<rect width="${width}" height="${height}" fill="#ffffff"/>
<text x="${pad.l}" y="20" font-size="13" font-weight="600" fill="#111827">${title}</text>
${grid}${xTicks}
<line x1="${pad.l}" y1="${pad.t}" x2="${pad.l}" y2="${pad.t + ih}" stroke="#9ca3af"/>
<line x1="${pad.l}" y1="${pad.t + ih}" x2="${pad.l + iw}" y2="${pad.t + ih}" stroke="#9ca3af"/>
<text x="14" y="${pad.t + ih / 2}" font-size="11" fill="#6b7280" transform="rotate(-90 14 ${pad.t + ih / 2})" text-anchor="middle">energy / initial</text>
${lines}${legend}
</svg>
`;
}

mkdirSync(join(ROOT, "docs"), { recursive: true });
const svg = plot({
  title: `Undamped tuft spring (k=${GRASS_K}, c=0) at dt = 1/120 s — energy should stay at 1.00`,
  yMax: 2,
  series: [
    { label: "semi-implicit Euler", color: "#2563eb", samples: undampedSemi },
    { label: "explicit Euler", color: "#dc2626", samples: undampedExpl },
  ],
});
writeFileSync(join(ROOT, "docs", "integrator-energy.svg"), svg);
console.log("\nwrote docs/integrator-energy.svg");
