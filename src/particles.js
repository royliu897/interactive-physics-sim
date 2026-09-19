// Loose grass and leaves. Each particle carries a pseudo-height `z` with its own
// velocity, so bits arc up and land instead of sliding along the ground plane.
// No particle-particle interaction: pairwise tests would be quadratic for
// detail that is invisible at this sprite size.

import { MAX_PARTICLES } from "./config.js";
import { random, rand, randomInt } from "./rng.js";
import { state } from "./state.js";

export function emitBurst(x, y, scale, strength = 1, count = 70) {
  for (let i = 0; i < count; i++) {
    const angle = random(0, Math.PI * 2);
    const speed = random(1.8, 6) * strength * scale;
    state.particles.push({
      x,
      y,
      z: random(0, 7) * scale,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed * 0.55,
      vz: random(3, 7) * strength * scale,
      rotation: random(0, 6),
      spin: random(-0.15, 0.15),
      size: random(15, 30) * scale,
      age: 0,
      life: random(0.85, 1.65),
      frame: randomInt(5),
      fall: rand() < 0.2,
    });
  }
  if (state.particles.length > MAX_PARTICLES)
    state.particles.splice(0, state.particles.length - MAX_PARTICLES);
}

export function updateParticles(seconds, dt, scale) {
  const particles = state.particles;
  const drag = Math.exp(-seconds * 1.8);
  const groundDrag = Math.exp(-10 * seconds);

  // Integrate and compact in a single pass: a live index trails the read index
  // and expired particles are simply not copied forward. Avoids allocating a
  // fresh array every step the way filter() did.
  let live = 0;
  for (let i = 0; i < particles.length; i++) {
    const p = particles[i];
    p.age += seconds;
    if (p.age >= p.life) continue;

    p.vz -= 0.25 * scale * dt;
    p.vx *= drag;
    p.vy *= drag;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.z += p.vz * dt;
    p.rotation += p.spin * dt;
    if (p.z < 0) {
      p.z = 0;
      p.vz = 0;
      p.vx *= groundDrag;
      p.vy *= groundDrag;
    }
    particles[live++] = p;
  }
  particles.length = live;
}
