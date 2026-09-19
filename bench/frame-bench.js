// Frame benchmark. Open bench/frame-bench.html over HTTP; no dependencies.
//
// Substantiates the performance claims in the README with measured numbers
// rather than assertions, by timing the real updatePhysics and draw against
// synthetic tuft and particle counts.

import { STEP } from "../src/config.js";
import { assets, canvas, loadAssets, sceneScale } from "../src/assets.js";
import { emitBurst } from "../src/particles.js";
import { draw } from "../src/render.js";
import { rand, setSeed } from "../src/rng.js";
import { updatePhysics } from "../src/simulation.js";
import { state } from "../src/state.js";
import { buildWorld, worldMetrics } from "../src/world.js";

const TUFT_COUNTS = [250, 500, 1000, 2000, 4000];
const PARTICLE_COUNTS = [0, 160, 320];
const WARMUP = 30;
const SAMPLES = 220;

/** Sprites must be decoded before timing draw, or the draw calls are skipped. */
const waitForAssets = (timeoutMs = 8000) =>
  new Promise((resolve) => {
    const deadline = performance.now() + timeoutMs;
    const tick = () => {
      const imgs = Object.values(assets);
      const done = imgs.length > 0 && imgs.every((i) => i.complete);
      if (done || performance.now() > deadline) resolve();
      else requestAnimationFrame(tick);
    };
    tick();
  });

/** Median is steadier than the mean here: GC pauses produce big one-off spikes. */
function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

/**
 * performance.now() is clamped to ~100 us in browsers, which is coarser than a
 * single physics step. Time a batch and divide so the result is meaningful.
 */
function time(fn, samples, batch) {
  const times = [];
  for (let i = 0; i < WARMUP; i++) fn();
  for (let i = 0; i < samples; i++) {
    const t0 = performance.now();
    for (let j = 0; j < batch; j++) fn();
    times.push((performance.now() - t0) / batch);
  }
  return median(times);
}

/**
 * Grow or shrink the tuft list to an exact count, keeping depth order.
 * Duplicates are spread across the whole ground band rather than stacked on
 * their source, so the draw pass sees a realistic distribution instead of
 * pathological overdraw in one column.
 */
function setTuftCount(base, n, bounds) {
  const grass = [];
  for (let i = 0; i < n; i++) {
    const src = base[i % base.length];
    const copy = Math.floor(i / base.length);
    grass.push({
      ...src,
      x: copy === 0 ? src.x : rand() * bounds.width,
      y: copy === 0 ? src.y : bounds.top + rand() * bounds.bandHeight,
      bend: 0,
      vbend: 0,
      compression: 0,
    });
  }
  grass.sort((a, b) => a.y - b.y);
  state.grass = grass;
}

async function main() {
  setSeed(1);
  loadAssets(() => {});
  canvas.width = 960;
  canvas.height = 600;
  await waitForAssets();
  buildWorld(true);

  // Mark the markers found up front: the encounter panel lives in the real
  // page, and a revealed marker still gets drawn, so the scene stays honest.
  for (const icon of state.icons) icon.revealed = true;

  const base = state.grass.slice();
  const scale = sceneScale();
  const { top, bandHeight } = worldMetrics();
  const bounds = { width: canvas.width, top, bandHeight };
  const rows = [];

  for (const particles of PARTICLE_COUNTS) {
    for (const tufts of TUFT_COUNTS) {
      setTuftCount(base, tufts, bounds);
      state.particles = [];
      if (particles) emitBurst(canvas.width / 2, canvas.height * 0.75, scale, 1, particles);

      // Keep the dog moving through grass so the contact branch is exercised.
      state.dog.x = canvas.width * 0.5;
      state.dog.y = canvas.height * 0.75;
      state.pointerActive = true;
      state.mouse = { x: canvas.width * 0.2, y: canvas.height * 0.75 };

      const physics = time(() => updatePhysics(STEP), SAMPLES, 40);
      const render = time(() => draw(), Math.round(SAMPLES / 4), 2);
      rows.push({ tufts, particles, physics, render });
    }
  }

  const budget = STEP * 1000;
  document.getElementById("out").innerHTML = `
    <p>${navigator.userAgent}</p>
    <p>canvas 960×600 · budget ${budget.toFixed(2)} ms/step at 120 Hz · median of ${SAMPLES}</p>
    <table>
      <tr><th>tufts</th><th>particles</th><th>physics ms</th><th>draw ms</th><th>% of step budget</th></tr>
      ${rows
        .map((r) => {
          const pct = (r.physics / budget) * 100;
          return `<tr><td>${r.tufts}</td><td>${r.particles}</td>
            <td>${r.physics.toFixed(3)}</td><td>${r.render.toFixed(3)}</td>
            <td class="${pct > 100 ? "over" : ""}">${pct.toFixed(1)}%</td></tr>`;
        })
        .join("")}
    </table>`;
  window.__bench = rows;
}

main();
