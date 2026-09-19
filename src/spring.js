// Damped-spring integration, kept free of DOM and canvas so bench/integrator.mjs
// can run the exact same force law the grass uses.
//
//   a = -k*x - c*v
//
// The grass hot loop calls springAccel directly to avoid allocating per tuft per
// step; the object-based steppers exist for readability and for the benchmark.

/** Restoring acceleration for displacement x and velocity v. */
export function springAccel(x, v, k, c) {
  return -k * x - c * v;
}

/**
 * Semi-implicit (symplectic) Euler: velocity advances first, then position moves
 * with the *new* velocity. Same cost as explicit Euler, but it does not pump
 * energy into an oscillator, so the grass settles instead of shaking itself apart.
 */
export function semiImplicitStep(s, k, c, dt) {
  s.v += springAccel(s.x, s.v, k, c) * dt;
  s.x += s.v * dt;
  return s;
}

/** Explicit (forward) Euler: both updates read the old state. Included for comparison. */
export function explicitStep(s, k, c, dt) {
  const a = springAccel(s.x, s.v, k, c);
  const x = s.x;
  s.x = x + s.v * dt;
  s.v = s.v + a * dt;
  return s;
}

/** Total energy of a unit-mass oscillator; constant for an undamped ideal integrator. */
export function energy(s, k) {
  return 0.5 * k * s.x * s.x + 0.5 * s.v * s.v;
}
