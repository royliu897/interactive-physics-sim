# interactive-physics-sim

A 2D physics simulation built for my [portfolio site](https://royrliu.com/interactive.html). A dog walks through a procedurally generated field, bending grass, kicking up particles, and navigating around trees — all running in real time in the browser on a single `<canvas>`.

**[Try the live demo →](https://royrliu.com/interactive.html)**

![demo](assets/demo.gif)

## What this project demonstrates

- Fixed-timestep game loop with semi-implicit Euler integration
- Damped-spring dynamics for grass deformation
- Particle system with gravity, drag, and lifetime management
- Acceleration-based character movement (not position-snapping)
- Spatial reasoning about when detailed physics matters and when cheap approximations are visually indistinguishable

## How the physics works

### Dog movement

The dog accelerates toward its target rather than teleporting to the cursor. Distance determines acceleration magnitude; a dead zone near the target lets it come to rest naturally. Velocity is capped so distant clicks don't produce unrealistic speed. The result feels like an invisible leash — the cursor leads, the dog follows with inertia.

### Grass as damped springs

Each tuft stays rooted in place. Only its visual bend is simulated. When the dog passes through, bend velocity is added in the contact direction. Afterward, the tuft follows a standard spring-and-damper model:

```
a = −k·x − c·v
```

where `x` is the bend displacement, `v` is bend velocity, `k` controls stiffness, and `c` controls damping. This is the model described in [Glenn Fiedler's Spring Physics](https://gafferongames.com/post/spring_physics/), applied per-tuft rather than per-blade — one spring represents the visible deformation of an entire tuft.

### Particles

Loose grass bits use a separate particle system. Each particle has position and velocity, with gravity pulling it down and drag reducing speed over time. Particles have short lifetimes and fade on settling. The system is capped at 320 particles, and there are no particle–particle collisions — pairwise detection would scale quadratically for details that aren't visible at this draw size.

### Integration

Physics runs at a fixed timestep of `1/120 s` using semi-implicit Euler: acceleration updates velocity first, then the new velocity updates position. This is more stable than explicit Euler for spring systems and decouples the simulation from the display refresh rate. Accumulated catch-up time is capped at `0.1 s` to prevent a slow frame from creating a feedback loop.

This follows the approach in [Fix Your Timestep!](https://gafferongames.com/post/fix_your_timestep/) by Glenn Fiedler.

### Collisions

Trees use circular footprints — enough to steer the dog around trunks without per-pixel sprite tests. Project objects use simple proximity checks. These approximations are intentional: detailed geometry where it changes how the scene feels, cheap tests where the result is visually indistinguishable.

## Performance decisions

- Terrain and small grass sprites are cached, not redrawn every frame.
- Rooted grass is sorted once at generation time; each frame merges that static ordering with the small set of moving objects.
- Per-tuft state instead of per-blade keeps the spring simulation O(n) in tuft count.
- No particle–particle collisions, no airflow simulation, no articulated skeleton — these would add cost without visible improvement at this scale.

The goal was to preserve the dynamics a viewer actually notices (inertia, spring recovery, gravity, drag) while keeping computation small enough for a smooth interactive webpage.

## What isn't simulated

This is deliberately a perceptual model, not a physically complete one. There is no airflow, blade-level grass mechanics, leaf deformation, articulated dog skeleton, or physical lighting. Some effects are exaggerated because physically accurate motion is too subtle to read at this scale.

## Running locally

```bash
# clone and serve — no build step, no dependencies
git clone https://github.com/royliu897/interactive-physics-sim.git
cd interactive-physics-sim
python3 -m http.server 8000
# open http://localhost:8000
```

## Artwork credits

Ground tiles from [Beast's Overworld — Grass Biome](https://opengameart.org/content/overworld-grass-biome) (CC0). Bending grass tufts are drawn in code. Dog, trees, and other sprites are original artwork.

## Contact

Roy Liu · [royrliu@utexas.edu](mailto:royrliu@utexas.edu) · [royrliu.com](https://royrliu.com)
