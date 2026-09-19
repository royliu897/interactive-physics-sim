// One fixed physics step.

import { sceneScale } from "./assets.js";
import { updateDog } from "./dog.js";
import { updateGrass } from "./grass.js";
import { emitBurst, updateParticles } from "./particles.js";
import { state } from "./state.js";
import { checkEncounters } from "./ui.js";

export function updatePhysics(seconds) {
  // `seconds` is real time; `dt` is the same interval expressed in 60 Hz frames,
  // which is the unit all the positional velocities are stored in.
  const dt = seconds * 60;
  const scale = sceneScale();

  const travelled = updateDog(seconds, dt, scale);
  const inGrass = updateGrass(state.dog, seconds, scale);

  if (inGrass) {
    state.stepDistance += travelled;
    if (state.stepDistance > 18 * scale) {
      state.stepDistance = 0;
      const speed = Math.hypot(state.dog.vx, state.dog.vy);
      emitBurst(
        state.dog.x,
        state.dog.y,
        scale,
        0.18 + speed / (35 * scale),
        Math.min(5, Math.ceil(speed / (2 * scale))),
      );
    }
  }

  checkEncounters(scale);
  updateParticles(seconds, dt, scale);
}
