// Tree placement and the dog's steering around trunks.
//
// Placement used to be pure rejection-free sampling, which regularly stacked two
// or three canopies on the same spot. Trees are now laid out with stratified
// sampling — each background tree owns an x slot and jitters inside it — with a
// rejection pass as a backstop for narrow viewports where the slots get tight.

import { random, randomInt, rand } from "./rng.js";

const BACK_SLOTS = [0.18, 0.5, 0.82];
const SLOT_JITTER = 0.05;
const PLACEMENT_TRIES = 24;

/** Width the canopy will actually be drawn at, used to judge overlap. */
function drawnWidth(tree, scale, canvasHeight) {
  const depth = 0.5 + tree.y / canvasHeight;
  return 128 * tree.size * scale * depth;
}

function overlaps(candidate, placed, scale, canvasHeight) {
  const cw = drawnWidth(candidate, scale, canvasHeight);
  for (const tree of placed) {
    const gap = 0.42 * (cw + drawnWidth(tree, scale, canvasHeight));
    // Trees at clearly different depths read as a treeline rather than a
    // collision, so only near-equal depths are held to the full gap.
    const depthApart = Math.abs(candidate.y - tree.y) > canvasHeight * 0.08;
    if (Math.abs(candidate.x - tree.x) < (depthApart ? gap * 0.55 : gap)) return true;
  }
  return false;
}

export function buildTrees({ width, height: canvasHeight, top, bandHeight, scale }) {
  const placed = [];

  const make = (x, y) => ({
    kind: "tree",
    x,
    y,
    frame: randomInt(15),
    type: rand() < 0.7 ? "treeGreen" : "treeFall",
    size: random(1.2, 1.7),
    collisionRadius: 23 * scale,
  });

  // Keep the best-separated candidate if no try clears the bar outright, so a
  // narrow viewport degrades to "least bad" instead of looping forever.
  const place = (sample) => {
    let fallback = null;
    for (let i = 0; i < PLACEMENT_TRIES; i++) {
      const candidate = sample();
      if (!overlaps(candidate, placed, scale, canvasHeight)) {
        placed.push(candidate);
        return;
      }
      fallback ??= candidate;
    }
    placed.push(fallback);
  };

  // Background treeline: one per stratified slot along the horizon.
  for (const slot of BACK_SLOTS) {
    place(() =>
      make(
        (slot + random(-SLOT_JITTER, SLOT_JITTER)) * width,
        top + random(0, 0.1) * bandHeight,
      ),
    );
  }

  // One framing tree on each side, low in the band so they sit in front.
  place(() => make(random(0.04, 0.11) * width, top + random(0.62, 0.95) * bandHeight));
  place(() => make(random(0.89, 0.96) * width, top + random(0.62, 0.95) * bandHeight));

  return placed;
}

/**
 * Anticipatory avoidance: if the dog is heading into a trunk, blend its desired
 * velocity toward the tangent rather than waiting for the hard collision below.
 */
export function steerAroundTrees(trees, dog, desired, scale) {
  let { x: desiredX, y: desiredY } = desired;
  for (const tree of trees) {
    const dx = tree.x - dog.x,
      dy = tree.y - dog.y,
      d = Math.hypot(dx, dy),
      speed = Math.hypot(desiredX, desiredY);
    if (
      d > 0 &&
      d < tree.collisionRadius + 50 * scale &&
      speed > 0.1 &&
      (dx * desiredX + dy * desiredY) / (d * speed) > 0.45
    ) {
      // Sign of the 2D cross product picks the side to peel off toward.
      const side = dx * desiredY - dy * desiredX >= 0 ? 1 : -1;
      const weight = 0.75 * (1 - Math.max(0, d - tree.collisionRadius) / (50 * scale));
      const nx = desiredX * (1 - weight) - (dy / d) * side * speed * weight;
      const ny = desiredY * (1 - weight) + (dx / d) * side * speed * weight;
      desiredX = nx;
      desiredY = ny;
    }
  }
  return { x: desiredX, y: desiredY };
}

/** Hard resolution: push the dog out of any trunk and remove inward velocity. */
export function resolveTreeCollisions(trees, dog, scale) {
  for (const tree of trees) {
    const dx = dog.x - tree.x,
      dy = dog.y - tree.y,
      d = Math.hypot(dx, dy),
      r = tree.collisionRadius + 8 * scale;
    if (d < r) {
      const nx = d ? dx / d : 1,
        ny = d ? dy / d : 0;
      dog.x = tree.x + nx * r;
      dog.y = tree.y + ny * r;
      const into = dog.vx * nx + dog.vy * ny;
      if (into < 0) {
        dog.vx -= into * nx;
        dog.vy -= into * ny;
      }
    }
  }
}
