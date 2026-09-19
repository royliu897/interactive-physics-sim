// Tunable constants for the simulation. Kept in one place so the benchmarks in
// bench/ can import the exact values the page runs with.

export const HORIZON_RATIO = 0.45;
export const STEP = 1 / 120;
export const MAX_PARTICLES = 320;

export const DOG_W = 32;
export const DOG_H = 40;

// Grass tuft spring: a = -GRASS_K * x - GRASS_C * v
export const GRASS_K = 85;
export const GRASS_C = 11;
export const GRASS_MAX_BEND = 1.1;

export const PROJECTS = [
  { id: "logiqal", label: "Logiqal", path: "https://royrliu.com/logiqal.html" },
  { id: "car", label: "Longhorn Racing", path: "https://royrliu.com/lhr.html" },
  { id: "gamma", label: "GAMMA Lab", path: "https://royrliu.com/research.html" },
  { id: "racket", label: "Tennis", path: "https://royrliu.com/tennis.html" },
  { id: "stock", label: "Stock Modeling", path: "https://royrliu.com/stocks.html" },
];
