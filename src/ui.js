// DOM-facing bits: pause state, the found counter, and the encounter panel.

import { PROJECTS } from "./config.js";
import { canvas } from "./assets.js";
import { assets } from "./assets.js";
import { sit } from "./dog.js";
import { state } from "./state.js";

export function updateFoundCount() {
  document.getElementById("foundCount").textContent =
    `${state.icons.filter((i) => i.revealed).length} / ${PROJECTS.length} found`;
}

export function setPaused(value) {
  state.paused = value;
  state.keys.clear();
  state.lastTime = null;
  state.accumulator = 0;
  const button = document.getElementById("pauseBtn");
  button.textContent = state.paused ? "Resume" : "Pause";
  button.setAttribute("aria-pressed", String(state.paused));
}

export function reveal(icon) {
  if (state.encounter || icon.revealed) return;
  icon.revealed = true;
  state.encounter = icon;
  sit();
  document.getElementById("encounterTitle").textContent = icon.label;
  document.getElementById("encounterImage").src = assets[icon.id].src;
  document.getElementById("encounterLink").href = icon.path;
  document.getElementById("encounterPanel").hidden = false;
  state.pointerActive = false;
  state.keys.clear();
  updateFoundCount();
  document.getElementById("encounterLink").focus({ preventScroll: true });
}

export function dismissEncounter() {
  state.encounter = null;
  document.getElementById("encounterPanel").hidden = true;
  state.dog.sitLock = false;
  state.sitRemaining = 0;
  state.pointerActive = false;
  canvas.focus({ preventScroll: true });
}

/** Proximity check against the project markers. Cheap: five objects. */
export function checkEncounters(scale) {
  if (state.encounter) return;
  for (const icon of state.icons) {
    if (
      !icon.revealed &&
      Math.hypot(state.dog.x - icon.x, state.dog.y - icon.y) < 30 * scale
    ) {
      reveal(icon);
      return;
    }
  }
}
