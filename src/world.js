// World generation: project patches, markers, grass, and trees.

import { HORIZON_RATIO, PROJECTS } from "./config.js";
import { canvas, groundBottom, sceneScale } from "./assets.js";
import { buildGrass } from "./grass.js";
import { buildTrees } from "./trees.js";
import { getSeed, random, setSeed } from "./rng.js";
import { state } from "./state.js";
import { updateFoundCount } from "./ui.js";

export function worldMetrics() {
  const top = canvas.height * HORIZON_RATIO;
  const bottom = groundBottom();
  return { top, bottom, bandHeight: bottom - top, scale: sceneScale() };
}

export function buildWorld(reset = true) {
  // Rebuild from the world seed every time, so a resize reproduces the same
  // scene and runtime randomness (particle bursts) can never shift the layout.
  setSeed(getSeed());

  const { top, bandHeight, scale } = worldMetrics();
  const width = canvas.width;

  state.patches = PROJECTS.map((project, i) => ({
    x: width * (0.16 + (i * 0.68) / (PROJECTS.length - 1)),
    y: top + bandHeight * (i % 2 ? 0.57 : 0.43),
    rx: width * 0.13,
    ry: bandHeight * 0.3,
  }));

  const old = state.icons;
  state.icons = PROJECTS.map((project, i) => ({
    ...project,
    kind: "icon",
    x: state.patches[i].x + random(-0.24, 0.24) * state.patches[i].rx,
    y: state.patches[i].y + random(-0.2, 0.2) * state.patches[i].ry,
    revealed: !reset && Boolean(old[i]?.revealed),
  }));

  state.grass = buildGrass({
    width,
    top,
    bottom: top + bandHeight,
    scale,
    patches: state.patches,
  });

  state.trees = buildTrees({
    width,
    height: canvas.height,
    top,
    bandHeight,
    scale,
  });

  state.particles = [];
  state.floorDirty = true;
  updateFoundCount();
}
