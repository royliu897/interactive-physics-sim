// Drawing. The physics never touches these functions and vice versa.

import { DOG_H, DOG_W, HORIZON_RATIO } from "./config.js";
import { assets, canvas, ctx, floorCache, groundBottom, ready, sceneScale } from "./assets.js";
import { grassSprites } from "./grass.js";
import { state } from "./state.js";

// The ground and its patch shading never change between frames, so they are
// rasterised into an offscreen canvas once and blitted.
export function paintFloor() {
  floorCache.width = canvas.width;
  floorCache.height = canvas.height;
  const c = floorCache.getContext("2d");
  c.imageSmoothingEnabled = false;
  const top = canvas.height * HORIZON_RATIO,
    bottom = groundBottom(),
    tile = 48 * sceneScale();
  c.fillStyle = "#819957";
  c.fillRect(0, top, canvas.width, bottom - top);
  if (ready(assets.terrain))
    for (let y = top; y < bottom; y += tile)
      for (let x = 0; x < canvas.width; x += tile)
        c.drawImage(assets.terrain, 0, 0, 16, 16, x, y, tile, tile);
  c.fillStyle = "rgba(42,70,43,.12)";
  for (const p of state.patches) {
    c.beginPath();
    c.ellipse(p.x, p.y, p.rx, p.ry, 0, 0, Math.PI * 2);
    c.fill();
  }
  state.floorDirty = false;
}

function drawSky() {
  ctx.fillStyle = "#9fc2ca";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  for (let i = 1; i <= 4; i++) {
    const img = assets["sky" + i];
    if (!ready(img)) continue;
    const h = canvas.height,
      w = (h * img.naturalWidth) / img.naturalHeight;
    // Layers scroll at different rates for parallax, and drift with the dog.
    const offset =
      -(state.simulationTime * (i - 1) * 0.0005 + state.dog.x * 0.012 * (i - 1)) % w;
    for (let x = offset; x < canvas.width; x += w) ctx.drawImage(img, x, 0, w, h);
  }
}

function drawObject(obj) {
  const scale = sceneScale(),
    p = 0.5 + obj.y / canvas.height;
  ctx.save();
  if (obj.kind === "grass") {
    const sway = state.paused
      ? 0
      : Math.sin(state.simulationTime * 0.0015 + obj.phase) * 0.035;
    const bend = obj.bend + sway,
      size = obj.size * p;
    ctx.translate(obj.x, obj.y);
    // Shear by the bend and squash by the compression: one transform stands in
    // for deforming the sprite's geometry.
    ctx.transform(1, 0, -bend * 0.5, 1 - obj.compression * 0.45, 0, 0);
    ctx.drawImage(grassSprites[obj.variant], -21 * size, -48 * size, 42 * size, 48 * size);
  } else if (obj.kind === "tree") {
    const img = assets[obj.type],
      size = 128 * obj.size * scale * p;
    if (ready(img))
      ctx.drawImage(
        img,
        (obj.frame % 4) * 128,
        Math.floor(obj.frame / 4) * 128,
        128,
        128,
        obj.x - size / 2,
        obj.y - size + 10 * scale,
        size,
        size,
      );
  } else if (obj.kind === "icon") {
    const size = 92 * scale * p;
    ctx.fillStyle = "rgba(14,32,22,.25)";
    ctx.beginPath();
    ctx.ellipse(obj.x, obj.y + 8 * scale, size * 0.5, size * 0.17, 0, 0, Math.PI * 2);
    ctx.fill();
    if (ready(assets[obj.id]))
      ctx.drawImage(assets[obj.id], obj.x - size / 2, obj.y - size * 0.85, size, size);
  } else {
    const { dog, simulationTime } = state;
    let row, col;
    const moving = Math.hypot(dog.vx, dog.vy) > 0.4;
    if (dog.sitLock) {
      row = 3;
      col = (dog.facing === "right" ? 0 : 2) + (Math.floor(simulationTime / 300) % 2);
    } else if (moving) {
      row = dog.facing === "right" ? 6 : 7;
      col = Math.floor(simulationTime / 85) % 4;
    } else {
      row = 1;
      col = (dog.facing === "right" ? 0 : 2) + (Math.floor(simulationTime / 500) % 2);
    }
    const w = 125 * scale * p,
      h = 148 * scale * p;
    ctx.fillStyle = "rgba(14,32,22,.24)";
    ctx.beginPath();
    ctx.ellipse(dog.x, dog.y + 4 * scale, w * 0.3, h * 0.08, 0, 0, Math.PI * 2);
    ctx.fill();
    if (ready(assets.dog))
      ctx.drawImage(assets.dog, col * DOG_W, row * DOG_H, DOG_W, DOG_H,
        dog.x - w / 2, dog.y - h * 0.77, w, h);
  }
  ctx.restore();
}

export function draw() {
  drawSky();
  if (state.floorDirty) paintFloor();
  ctx.drawImage(floorCache, 0, 0);

  // Rooted grass is already in depth order; merge the handful of moving actors
  // into it rather than sorting the whole scene every frame.
  const actors = [...state.trees, ...state.icons.filter((i) => i.revealed), state.dog].sort(
    (a, b) => a.y - b.y,
  );
  let actor = 0;
  for (const tuft of state.grass) {
    while (actor < actors.length && actors[actor].y <= tuft.y) drawObject(actors[actor++]);
    drawObject(tuft);
  }
  while (actor < actors.length) drawObject(actors[actor++]);

  for (const p of state.particles) {
    const img = p.fall ? assets.fallLeaf : assets.leaf;
    if (!ready(img)) continue;
    ctx.save();
    ctx.globalAlpha = Math.min(1, (p.life - p.age) / 0.4);
    ctx.translate(p.x, p.y - p.z);
    ctx.rotate(p.rotation);
    ctx.drawImage(img, p.frame * 16, 0, 16, 16, -p.size / 2, -p.size / 2, p.size, p.size);
    ctx.restore();
  }
}
