// Dog movement.
//
// The dog is never snapped to the cursor. A desired velocity is derived from the
// distance to the target, then the actual velocity eases toward it, so the
// cursor leads and the dog follows with inertia.

import { HORIZON_RATIO } from "./config.js";
import { canvas, groundBottom, sceneScale } from "./assets.js";
import { disturb } from "./grass.js";
import { emitBurst } from "./particles.js";
import { resolveTreeCollisions, steerAroundTrees } from "./trees.js";
import { state } from "./state.js";

export function sit() {
  const { dog } = state;
  if (dog.sitLock) return;
  dog.sitLock = true;
  dog.targetAction = null;
  dog.vx = 0;
  dog.vy = 0;
  state.sitRemaining = 0.8;
  const scale = sceneScale();
  emitBurst(dog.x, dog.y, scale, 1.25, 95);
  disturb(dog.x, dog.y, 115 * scale, 15);
}

export function updateDog(seconds, dt, scale) {
  const { dog } = state;
  const top = canvas.height * HORIZON_RATIO + 12 * scale,
    bottom = groundBottom() - 16 * scale;

  if (dog.sitLock && !state.encounter) {
    state.sitRemaining -= seconds;
    if (state.sitRemaining <= 0) dog.sitLock = false;
  }

  let desired = { x: 0, y: 0 };
  if (!dog.sitLock && !state.encounter) {
    const keys = state.keys;
    const kx = Number(keys.has("ArrowRight")) - Number(keys.has("ArrowLeft"));
    const ky = Number(keys.has("ArrowDown")) - Number(keys.has("ArrowUp"));
    if (kx || ky) {
      const length = Math.hypot(kx, ky);
      desired = { x: (kx / length) * 8 * scale, y: (ky / length) * 8 * scale };
    } else if (dog.targetAction || state.pointerActive) {
      const target = dog.targetAction || state.mouse;
      const dx = target.x - dog.x,
        dy = Math.max(top, Math.min(bottom, target.y)) - dog.y,
        d = Math.hypot(dx, dy);
      // A click walks all the way in; the bare cursor keeps a slack radius.
      const leash = dog.targetAction ? 0 : 75 * scale;
      if (dog.targetAction && d < 7 * scale) sit();
      else if (d > leash) {
        const speed = dog.targetAction
          ? Math.min(9 * scale, d * 0.22)
          : Math.min(14 * scale, (d - leash) * 0.065);
        desired = { x: (dx / d) * speed, y: (dy / d) * speed };
      }
    }
    desired = steerAroundTrees(state.trees, dog, desired, scale);
  }

  const ease = 1 - Math.exp(-seconds * 14);
  dog.vx += (desired.x - dog.vx) * ease;
  dog.vy += (desired.y - dog.vy) * ease;
  if (dog.sitLock || state.encounter) {
    dog.vx = 0;
    dog.vy = 0;
  }

  const oldX = dog.x,
    oldY = dog.y;
  dog.x += dog.vx * dt;
  dog.y += dog.vy * dt;

  resolveTreeCollisions(state.trees, dog, scale);

  dog.x = Math.max(15 * scale, Math.min(canvas.width - 15 * scale, dog.x));
  dog.y = Math.max(top, Math.min(bottom, dog.y));
  if (Math.abs(dog.vx) > 0.1) dog.facing = dog.vx > 0 ? "right" : "left";

  return Math.hypot(dog.x - oldX, dog.y - oldY);
}
