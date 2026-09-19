// Entry point: seed, load, wire up, run the fixed-timestep loop.

import { HORIZON_RATIO, STEP } from "./config.js";
import { canvas, ctx, groundBottom, loadAssets } from "./assets.js";
import { attachInput } from "./input.js";
import { attachNotes } from "./notes.js";
import { draw } from "./render.js";
import { getSeed, seedFromLocation } from "./rng.js";
import { updatePhysics } from "./simulation.js";
import { state } from "./state.js";
import { buildWorld } from "./world.js";
import { setPaused } from "./ui.js";

const motionPreference = matchMedia("(prefers-reduced-motion: reduce)");

function resize(reset = false) {
  const oldWidth = canvas.width || innerWidth,
    oldHeight = canvas.height || innerHeight;
  canvas.width = innerWidth;
  canvas.height = innerHeight;
  ctx.imageSmoothingEnabled = false;
  const { dog } = state;
  dog.x = reset ? canvas.width * 0.5 : (dog.x / oldWidth) * canvas.width;
  dog.y = reset
    ? canvas.height * HORIZON_RATIO + (groundBottom() - canvas.height * HORIZON_RATIO) * 0.84
    : Math.min((dog.y / oldHeight) * canvas.height, groundBottom() - 20);
  dog.targetAction = null;
  dog.vx = 0;
  dog.vy = 0;
  state.mouse = { x: dog.x, y: dog.y };
  state.pointerActive = false;
  buildWorld(reset);
}

function loop(timestamp) {
  // Clamp the catch-up budget: without this, one slow frame makes the next frame
  // run even more physics, which makes it slower still.
  const elapsed =
    state.lastTime === null ? 0 : Math.min(0.1, (timestamp - state.lastTime) / 1000);
  state.lastTime = timestamp;
  if (!state.paused && !document.hidden) {
    state.accumulator += elapsed;
    while (state.accumulator + 1e-10 >= STEP) {
      state.simulationTime += STEP * 1000;
      updatePhysics(STEP);
      state.accumulator -= STEP;
    }
  }
  draw();
  requestAnimationFrame(loop);
}

seedFromLocation(location.search);
loadAssets(() => {
  state.floorDirty = true;
});

state.paused = motionPreference.matches;
motionPreference.addEventListener("change", (e) => setPaused(e.matches));

attachInput({ resize });
attachNotes();

resize(true);
setPaused(state.paused);

// Exposed for bench/ and for reproducing a world from the console.
window.__sim = { state, seed: getSeed(), resize, updatePhysics, draw, STEP };
console.info(`simulation seed: ${getSeed()} (append ?seed=${getSeed()} to reproduce)`);

requestAnimationFrame(loop);
