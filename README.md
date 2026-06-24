# Cosmic Voyage — Interactive 3D Space Scene

An immersive, scroll-driven 3D space experience built with Three.js. Explore a procedurally generated planet with realistic terrain, clouds, and city lights. Fly past a detailed space station, watch a spaceship streak by, and peer into a mysterious dimensional portal — all controlled by scrolling.

**All models and code are created by me.**

---

## Features

- **Procedural Planet** — Earth-like world with multi-octave noise terrain, oceans, mountains, ice caps, deserts, clouds, storms, atmosphere layers, and city lights on the night side
- **Space Station** — Detailed modular station with 6 arms, solar panels, antenna arrays, blinking nav lights, docking ports, and thruster nozzles
- **Spaceship** — Animated ship with glowing engines, shader-based exhaust trails, navigation lights, and a particle trail effect
- **Dimensional Portal** — Vortex shader with orbital particles, rune rings, energy beams, and ambient glow
- **Animated Sun** — Procedural shader sun with solar flares, corona glow, and dynamic lighting
- **Asteroid Belt** — Orbiting asteroids around the planet
- **Nebula Background** — Deep space nebula layers with additive blending
- **Dust Particles** — Floating space dust with shader-based rendering
- **Scroll-Driven Camera** — Smooth keyframe-based camera path with wheel and touch input, looping back to the start
- **Post-Processing Pipeline** — Bloom, film grain, chromatic aberration, vignette, depth of field, and motion blur
- **Proximity VFX** — Particle effects that intensify as the camera approaches Earth, the station, or the portal
- **Full Lighting Setup** — Directional sun, ambient, hemisphere, rim, fill, and portal glow lights with shadow mapping

---

## Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/your-username/cosmic-voyage.git
   cd cosmic-voyage
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Start the development server**

   ```bash
   npm run dev
   ```

4. Open your browser at the URL shown in the terminal (usually `http://localhost:5173`)

---

## Usage

- **Scroll** (mouse wheel) or **swipe** (touch) to navigate through the scene
- The camera follows a pre-defined cinematic path: Earth orbit → Space station → Dimensional portal
- The scene loops automatically when you reach the end

---

## Tech Stack

| Technology | Purpose |
|---|---|
| **Three.js** | 3D rendering engine |
| **Vite** | Build tool and dev server |
| **GLSL Shaders** | Custom planet terrain, clouds, atmosphere, portal vortex, sun surface, exhaust trails, and post-processing effects |
| **JavaScript (ES Modules)** | Modular codebase |

---

## Future Improvements

- [ ] Add sound effects and ambient space audio
- [ ] Implement interactive controls (WASD / mouse look)
- [ ] Add more celestial objects (rings, moons, comets)
- [ ] Mobile performance optimizations
- [ ] Loading progress bar instead of simple loading text
- [ ] Add a HUD / UI overlay with scene information

---

## License

This project is personal work. All 3D models, shaders, and code are original creations.
