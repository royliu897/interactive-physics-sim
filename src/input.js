// Pointer, keyboard, and window event wiring.

import { HORIZON_RATIO } from "./config.js";
import { canvas, groundBottom } from "./assets.js";
import { sit } from "./dog.js";
import { state } from "./state.js";
import { dismissEncounter, setPaused } from "./ui.js";

const MOVE_KEYS = ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " ", "p", "P"];

export function attachInput({ resize }) {
  canvas.addEventListener("pointermove", (e) => {
    if (state.encounter) return;
    state.mouse = { x: e.clientX, y: e.clientY };
    if (e.pointerType === "mouse") {
      state.pointerActive = true;
    } else if (e.buttons) {
      state.dog.targetAction = { ...state.mouse };
    }
  });

  canvas.addEventListener("pointerleave", () => {
    state.pointerActive = false;
  });

  canvas.addEventListener("pointerdown", (e) => {
    if (state.paused || state.encounter || (e.pointerType === "mouse" && e.button !== 0))
      return;
    canvas.focus({ preventScroll: true });
    state.mouse = { x: e.clientX, y: e.clientY };
    if (e.clientY < canvas.height * HORIZON_RATIO || e.clientY > groundBottom()) return;
    state.dog.targetAction = { ...state.mouse };
    state.pointerActive = e.pointerType === "mouse";
  });

  canvas.addEventListener("keydown", (e) => {
    if (!MOVE_KEYS.includes(e.key)) return;
    e.preventDefault();
    if (e.key === " ") {
      if (!state.paused && !state.encounter && !e.repeat) sit();
      return;
    }
    if (e.key.toLowerCase() === "p") {
      if (!e.repeat) setPaused(!state.paused);
      return;
    }
    if (!state.encounter) {
      state.keys.add(e.key);
      state.dog.targetAction = null;
    }
  });

  window.addEventListener("keyup", (e) => state.keys.delete(e.key));
  window.addEventListener("blur", () => {
    state.keys.clear();
    state.pointerActive = false;
  });
  canvas.addEventListener("blur", () => state.keys.clear());

  document.addEventListener("visibilitychange", () => {
    state.lastTime = null;
    state.accumulator = 0;
    state.keys.clear();
    state.pointerActive = false;
  });

  document.getElementById("pauseBtn").onclick = () => setPaused(!state.paused);
  document.getElementById("keepWalking").onclick = dismissEncounter;
  document.getElementById("resetBtn").onclick = () => {
    dismissEncounter();
    resize(true);
  };

  let resizeTimer;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => resize(false), 150);
  });
}
