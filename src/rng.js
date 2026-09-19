// Seeded PRNG.
//
// The scene used to be built from bare Math.random(), which meant no two loads
// produced the same world and nothing about it could be benchmarked, diffed, or
// screenshotted reproducibly. mulberry32 is small, fast, and has good enough
// distribution for sprite scatter.

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

let seed = 0;
let next = mulberry32(0);

/** Reseed the shared stream. Returns the seed actually used. */
export function setSeed(value) {
  seed = value >>> 0;
  next = mulberry32(seed);
  return seed;
}

export function getSeed() {
  return seed;
}

/** Uniform in [0, 1). */
export function rand() {
  return next();
}

/** Uniform in [a, b). */
export function random(a, b) {
  return a + next() * (b - a);
}

/** Integer in [0, n). */
export function randomInt(n) {
  return Math.floor(next() * n);
}

/**
 * Seed from ?seed=N when present so a world can be linked to and reproduced,
 * otherwise pick one at random and record it for the console.
 */
export function seedFromLocation(search = "") {
  const requested = new URLSearchParams(search).get("seed");
  const parsed = requested === null ? NaN : Number.parseInt(requested, 10);
  return setSeed(Number.isFinite(parsed) ? parsed : (Math.random() * 2 ** 32) >>> 0);
}
