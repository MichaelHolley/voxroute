# VoxRoute

3D GPX route visualizer. Upload a `.gpx` file and fly through your route rendered as a gradient-colored elevation tube in a Three.js scene.

## Features

- Drag-and-drop or click to upload `.gpx` files
- 3D CatmullRom tube with elevation-based color gradient
- Smooth fly-through camera animation with exponential damping
- Stats panel: distance, elevation gain/loss, duration
- Demo route included — no file needed to try it

## Stack

- **Vue 3** + TypeScript (Composition API, `<script setup>`)
- **Three.js** for 3D rendering
- **Tailwind CSS v4** via `@tailwindcss/vite`
- **Vite+** (`vp`) for dev, build, lint, type-check

## Getting Started

```bash
pnpm install   # or: vp install
vp dev
```

## Scripts

| Command      | What it does             |
| ------------ | ------------------------ |
| `vp dev`     | Dev server               |
| `vp build`   | Type-check + bundle      |
| `vp preview` | Preview production build |
| `vp check`   | Format, lint, type-check |
