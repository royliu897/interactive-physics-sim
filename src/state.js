// Shared mutable simulation state.
//
// Held in one object rather than as module-level `let`s because ES module
// bindings are read-only to importers — a plain object keeps every module
// looking at the same values without a pile of setters.

export const state = {
  paused: false,
  encounter: null,

  lastTime: null,
  accumulator: 0,
  simulationTime: 0,
  sitRemaining: 0,
  stepDistance: 0,

  mouse: { x: 0, y: 0 },
  pointerActive: false,
  keys: new Set(),

  dog: {
    kind: "dog",
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    facing: "right",
    row: 1,
    col: 0,
    targetAction: null,
    sitLock: false,
  },

  grass: [],
  trees: [],
  icons: [],
  patches: [],
  particles: [],

  floorDirty: true,
};
