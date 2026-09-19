# interactive-physics-sim

The idea came from Pokémon. You walk through tall grass, the grass shakes, and
something comes out at you. I wanted the projects page on my site to work the
same way, so this is a field you walk a dog through, except what you run into is
one of my projects or experiences instead of a wild Pokémon.

Live version: [royrliu.com/interactive.html](https://royrliu.com/interactive.html)

![demo](assets/demo.gif)

Once I started building it I got more interested in the field than in the
encounters. Making the grass react to the dog, rather than play a fixed
animation, turned into most of the work. This repository is the standalone
version of that page: one `<canvas>`, no libraries, and no build step.

It is a perceptual model, not a physically complete one. I picked a few effects
that are noticeable while walking through grass, gave them simple dynamics, and
tried to keep the whole thing cheap enough to run smoothly in a browser.

## What the code does

- Moves the dog by acceleration toward a target instead of setting its position.
- Simulates each grass tuft as a single damped spring and bends the whole sprite
  by the result.
- Runs a particle system for the loose grass, with gravity, drag, and a
  pseudo-height so pieces arc and land.
- Integrates at a fixed `1/120 s` timestep with semi-implicit Euler, decoupled
  from the display refresh rate.
- Generates the world from a seed, so a given scene can be reproduced.

## Dog movement

The first version set the dog's position to the cursor directly. It looked wrong
immediately: the dog arrived everywhere instantly and nothing else in the scene
had any reason to react. So the dog now accelerates toward its target instead.
Each step finds the vector to the target and uses the distance to decide how
hard to accelerate. Farther targets make it speed up, the acceleration falls off
as it gets close, and a small dead zone lets it come to rest instead of
correcting back and forth around the cursor forever. Velocity is capped so a
click on the far side of the screen does not produce an unrealistic jump.

That gives the cursor a bit of slack, almost like an invisible leash. It also
means the dog's velocity is a useful input elsewhere: running through a patch of
grass produces a larger disturbance than walking through the same patch.

A click and the bare cursor take different speed limits, so leading the dog
around is faster than clicking somewhere and letting it walk over.

## Grass as damped springs

I originally considered treating the grass as particles, but that spends a lot
of computation on motion that is barely visible at this scale. Instead every
tuft stays fixed at its root and only its visual bend is simulated. When the dog
passes through, it adds bend velocity in the direction of contact, and afterward
the tuft behaves like a damped spring and returns to upright.

For a bend `x` with bend velocity `v`, the restoring acceleration is:

```
a = -k*x - c*v
```

The `-k*x` term pulls the tuft back toward vertical and `-c*v` removes energy so
it settles instead of oscillating forever. Increasing `k` makes the grass feel
stiffer, increasing `c` makes it settle faster. The page runs `k = 85` and
`c = 11`.

This is the standard spring-and-damper model from
[Glenn Fiedler's Spring Physics](https://gafferongames.com/post/spring_physics/).
The simplification is where I apply it: one spring stands in for the visible
deformation of an entire tuft rather than simulating every blade.

## Particles

The bits kicked into the air are a separate system. Each particle has a position
and velocity, with gravity pulling it down and drag reducing its speed. They
carry a pseudo-height `z` with its own velocity, so pieces arc up and land
instead of sliding along the ground plane. Lifetimes are short and particles
fade once they settle. Sitting applies a larger local impulse than walking,
which is why it kicks up a much more noticeable burst.

I left out particle-particle collisions, airflow, and detailed leaf rotation.
Those would make the model more complete, but pairwise detection scales
quadratically for details that are hard to notice at the size the particles are
drawn.

## Integration

The physics runs at a fixed timestep of `1/120 s`. Acceleration updates velocity
first, and the new velocity then updates position. This is semi-implicit Euler:
the same cost as ordinary explicit Euler, but much better behaved for
spring-like systems.

Rendering is kept separate from the physics clock, so a 60 Hz display, a 144 Hz
display, or an occasional slow frame should not change the underlying motion. If
rendering falls behind, the simulation runs multiple fixed steps to catch up,
but accumulated catch-up time is capped at `0.1 s`. Without that cap one
unusually slow frame can start a feedback loop where the browser has to run more
and more physics just to keep up. This follows
[Fix Your Timestep!](https://gafferongames.com/post/fix_your_timestep/).

## Collisions

Not everything on screen needs detailed geometry. Trees use circular footprints,
which is enough to make the dog steer around their trunks without testing
against every transparent pixel of the sprite. Avoidance happens in two stages:
if the dog is heading into a trunk, its desired velocity is first blended toward
the tangent so it peels off early, and then a hard positional check pushes it
out of the trunk and removes the inward part of its velocity. The project
objects use simple proximity checks, and grounding shadows are drawn ellipses
rather than simulated lighting.

## What I measured

The claims above were assertions for a long time, so I wrote two small
benchmarks to check them.

### Frame cost

`bench/frame-bench.html` times the real `updatePhysics` against synthetic tuft
and particle counts. At 120 Hz the budget is `8.33 ms` per step. A live scene
holds 363 tufts at 760x470 and 1780 at 1920x1080, so this range brackets real
use. Median of 220 batched samples, headless Chromium 153 under WSL2:

- 250 tufts: `0.008 ms` per step, 0.1% of the budget
- 500 tufts: `0.010 ms` per step, 0.1% of the budget
- 1000 tufts: `0.015 ms` per step, 0.2% of the budget
- 2000 tufts: `0.032 ms` per step, 0.4% of the budget
- 4000 tufts: `0.065 ms` per step, 0.8% of the budget

Cost doubles as the tuft count doubles, which is what I wanted to confirm.
Saturating the particle system at its cap of 320 moves these numbers by less
than a microsecond, so the springs dominate. The harness also reports draw time,
but the machine I ran it on has no GPU and falls back to software rasterization,
so those numbers describe SwiftShader more than they describe the renderer.

The contact test between the dog and the grass runs inside the same pass the
spring update already needs, so there is no second traversal. At these counts a
spatial index would cost more to maintain than it saves.

### Integrator

`bench/integrator.mjs` runs explicit and semi-implicit Euler over the same force
law and the same `k` the grass uses.

```bash
node bench/integrator.mjs
```

![Energy drift of explicit versus semi-implicit Euler](docs/integrator-energy.svg)

With the damping removed the exact solution conserves energy, so whatever drift
shows up belongs to the integrator. After 4 s at `dt = 1/120 s`, as a fraction
of the initial energy:

- semi-implicit Euler: `1.04`, oscillating inside a bounded band
- explicit Euler: `16.86`, and still climbing

Semi-implicit does not conserve energy exactly, but its error stays bounded
instead of accumulating. The gap grows quickly with the timestep:

- `1/480 s`: semi-implicit `1.010`, explicit `2.03`
- `1/240 s`: semi-implicit `1.020`, explicit `4.12`
- `1/120 s`: semi-implicit `1.040`, explicit `16.9`
- `1/60 s`: semi-implicit `1.083`, explicit `271`
- `1/30 s`: semi-implicit `1.171`, explicit `5.05e4`
- `1/15 s`: semi-implicit `1.144`, explicit `2.24e8`

The part I found most interesting is that with the real damping of `c = 11`,
explicit Euler does not visibly blow up at `1/120 s`, because the damping term
bleeds energy off faster than the integrator adds it. So the wrong choice looks
fine until the timestep slips or someone stiffens the spring. Semi-implicit
costs exactly the same per step, so there is no reason to take that risk.

## Determinism

The scene used to be built from bare `Math.random()`, which meant no two loads
produced the same field and nothing about it could be benchmarked or compared.
It now uses a seeded PRNG (mulberry32), so a world can be reproduced and linked
to:

```
http://localhost:8000/interactive.html?seed=12345
```

Without `?seed` a random seed is chosen and logged to the console. The world is
rebuilt from the seed on every resize, so runtime randomness like particle
bursts and sprite frames cannot shift the layout.

Seeding is also what let me fix the trees. They used to be placed by uniform
random sampling, which regularly stacked two or three canopies on the same spot.
Each background tree now owns a slot along the horizon and jitters inside it,
with a rejection pass as a backstop for narrow viewports where the slots get
tight.

## Repository layout

- `src/config.js`: constants shared by the page and the benchmarks.
- `src/rng.js`: seeded PRNG.
- `src/spring.js`: the damped-spring force law and both integrators.
- `src/state.js`: shared mutable simulation state.
- `src/grass.js`: tuft generation, sprites, and the spring update.
- `src/particles.js`: emission, integration, and in-place compaction.
- `src/trees.js`: placement, steering, and collision response.
- `src/dog.js`: acceleration-based movement.
- `src/world.js`: world generation.
- `src/simulation.js`: one fixed physics step.
- `src/render.js`: all drawing.
- `src/input.js`: pointer, keyboard, and window events.
- `src/ui.js`: pause, found counter, and the encounter panel.
- `src/notes.js`: the "About the simulation" dialog.
- `src/main.js`: entry point and the fixed-timestep loop.
- `bench/`: the two benchmarks above.
- `docs/`: generated charts.

`src/spring.js` has no canvas or DOM dependency, which is what lets the
benchmark exercise the same force law the page runs instead of a copy of it that
can drift.

## Running it

```bash
git clone https://github.com/royliu897/interactive-physics-sim.git
cd interactive-physics-sim
python3 -m http.server 8000
```

Then open `http://localhost:8000`. ES modules need a real origin, so opening the
file over `file://` will not work.

```bash
node bench/integrator.mjs
```

The frame benchmark is at `http://localhost:8000/bench/frame-bench.html`.

## What is not simulated

There is no airflow, no blade-level grass mechanics, no leaf deformation, no
articulated dog skeleton, and no physical lighting. Some effects are exaggerated
on purpose, because physically accurate motion is too subtle to read at this
scale.

## Scope note

This started as a small physics experiment for my portfolio and it is still that.
The goal was to preserve the dynamics a viewer actually notices, meaning inertia,
spring recovery, gravity, drag, and settling, without turning the page into a
rigid-body or soft-body simulator.

## Artwork credits

Ground tiles are from
[Beast's Overworld Grass Biome](https://opengameart.org/content/overworld-grass-biome),
released under CC0. The bending grass tufts are drawn in code. The dog, trees,
and project objects are from my site's existing artwork. Full details are in
`assets/CREDITS.md`.

Contact: `royrliu@utexas.edu`
