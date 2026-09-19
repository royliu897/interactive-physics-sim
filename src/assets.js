// Canvas handles, image loading, and the few geometry helpers that depend on
// the live canvas size.

import { rand } from "./rng.js";

export const canvas = document.getElementById("gameCanvas");
export const ctx = canvas.getContext("2d", { alpha: false });

export const assets = {};
export const floorCache = document.createElement("canvas");

const SPRITES = {
  dog: "dog.png",
  leaf: "spring_leaf.png",
  fallLeaf: "fall_leaf.png",
  treeGreen: "tree_green.png",
  treeFall: "tree_fall.png",
  terrain: "overworld-grass.png",
  car: "car.png",
  gamma: "gamma.png",
  racket: "racket.png",
  stock: "stock.png",
  logiqal: "logiqal-icon.svg",
};

/** Which of the eight cloud sets this world uses. Drawn from the seeded stream. */
export let skyId = 1;

// Resolved against this module's own URL rather than the page's, so the
// benchmark harness in bench/ loads the same sprites the page does.
const assetUrl = (file) => new URL(`../assets/${file}`, import.meta.url).href;

export function loadAssets(onTerrainLoad) {
  skyId = 1 + Math.floor(rand() * 8);
  for (const [id, src] of Object.entries(SPRITES)) {
    assets[id] = new Image();
    assets[id].src = assetUrl(src);
  }
  for (let i = 1; i <= 4; i++) {
    assets["sky" + i] = new Image();
    assets["sky" + i].src = assetUrl(`Clouds/Clouds ${skyId}/${i}.png`);
  }
  assets.terrain.onload = onTerrainLoad;
}

export function ready(img) {
  return img && img.complete && img.naturalWidth > 0;
}

export function sceneScale() {
  return Math.max(0.45, Math.min(1, canvas.width / 1000));
}

export function groundBottom() {
  return canvas.height - document.getElementById("footer").offsetHeight;
}
