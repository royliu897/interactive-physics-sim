// The grass field.
//
// Every tuft stays rooted where it was generated; only its visual bend is
// simulated, as a single damped spring standing in for the whole tuft rather
// than one per blade. That keeps the update O(n) in tuft count, and the dog
// contact test rides along in the same pass the spring update already needs.

import { GRASS_C, GRASS_K, GRASS_MAX_BEND } from "./config.js";
import { random, randomInt } from "./rng.js";
import { springAccel } from "./spring.js";
import { state } from "./state.js";

// Small original pixel tufts: rasterised once, then bent as whole sprites.
// Ground tiles beneath them come from Beast's CC0 Grass Biome atlas.
export function makeGrassSprite(variant) {
  const image = document.createElement("canvas");
  image.width = 20;
  image.height = 24;
  const c = image.getContext("2d");
  const colors = [
    ["#35513b", "#52754c", "#86a95f"],
    ["#3e5b3d", "#63844f", "#a4bb6b"],
    ["#304b39", "#4b714b", "#87a565"],
  ][variant];
  for (let i = 0; i < 5; i++) {
    const x = 2 + i * 4,
      h = [12, 18, 22, 16, 11][(i + variant) % 5];
    const lean = [-4, -2, 0, 2, 4][i];
    c.fillStyle = colors[0];
    c.beginPath();
    c.moveTo(x - 1, 24);
    c.lineTo(x - 1, 24 - h * 0.5);
    c.lineTo(x + lean, 24 - h);
    c.lineTo(x + 3, 24 - h * 0.4);
    c.lineTo(x + 3, 24);
    c.fill();
    c.fillStyle = colors[1];
    c.fillRect(x, 24 - Math.floor(h * 0.65), 2, Math.floor(h * 0.65));
    c.fillStyle = colors[2];
    c.fillRect(x + lean, 24 - h, 1, Math.max(2, Math.floor(h * 0.35)));
  }
  return image;
}

export const grassSprites = [0, 1, 2].map(makeGrassSprite);

export function buildGrass({ width, top, bottom, scale, patches }) {
  const spacing = Math.max(12, 21 * scale);
  const grass = [];
  for (
    let row = 0, y = top + 18 * scale;
    y < bottom + 12 * scale;
    y += spacing * 0.65, row++
  ) {
    for (let x = 0; x < width + spacing; x += spacing) {
      const gx = x + (row % 2) * spacing * 0.5 + random(-4, 4) * scale,
        gy = y + random(-3, 3) * scale;
      const distance = Math.min(
        ...patches.map((p) => ((gx - p.x) / p.rx) ** 2 + ((gy - p.y) / p.ry) ** 2),
      );
      if (distance > random(0.85, 1.22)) continue;
      grass.push({
        kind: "grass",
        x: gx,
        y: gy,
        bend: 0,
        vbend: 0,
        compression: 0,
        variant: randomInt(3),
        phase: random(0, Math.PI * 2),
        size: random(0.85, 1.15) * scale,
      });
    }
  }
  // Pre-sorted by depth once at generation time; the draw pass merges the small
  // set of moving actors into this static ordering instead of re-sorting.
  grass.sort((a, b) => a.y - b.y);
  return grass;
}

/** Push tufts within `radius` away from (x, y). Used by the sit impulse. */
export function disturb(x, y, radius, strength) {
  for (const tuft of state.grass) {
    const dx = tuft.x - x,
      dy = tuft.y - y,
      d = Math.hypot(dx, dy);
    if (d < radius) {
      const power = 1 - d / radius;
      tuft.vbend += (dx < 0 ? -1 : 1) * power * strength;
      tuft.compression = Math.max(tuft.compression, power * 0.85);
    }
  }
}

/**
 * Advance every tuft one step and register contact with the dog.
 * Returns true if the dog is standing in grass this step.
 */
export function updateGrass(dog, seconds, scale) {
  const speed = Math.hypot(dog.vx, dog.vy),
    contact = 44 * scale;
  const decay = Math.exp(-3 * seconds);
  let inGrass = false;

  for (const tuft of state.grass) {
    const dx = tuft.x - dog.x,
      dy = tuft.y - dog.y,
      d = Math.hypot(dx, dy);
    if (d < contact && speed > 0.3) {
      inGrass = true;
      const force = (1 - d / contact) * Math.min(1, speed / (9 * scale));
      tuft.vbend +=
        ((dx < 0 ? -1 : 1) * 0.6 + (dog.vx / (14 * scale)) * 0.4) * force * 45 * seconds;
      tuft.compression = Math.max(tuft.compression, force * 0.7);
    }

    // Semi-implicit Euler: new velocity first, then position from it.
    tuft.vbend += springAccel(tuft.bend, tuft.vbend, GRASS_K, GRASS_C) * seconds;
    tuft.bend += tuft.vbend * seconds;
    tuft.bend = Math.max(-GRASS_MAX_BEND, Math.min(GRASS_MAX_BEND, tuft.bend));
    tuft.compression *= decay;
  }
  return inGrass;
}
