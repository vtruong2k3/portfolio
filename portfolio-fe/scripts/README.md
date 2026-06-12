# Asset Pipeline & Public_Asset_Layout

This directory holds the build-time asset tooling for the **Portfolio 3D Asset
Suite**. It documents how 3D models, textures, and icons are optimized and where
their outputs live under `public/`.

_Requirements: 2.3, 2.6_

## `optimize:assets` script

Run the asset optimization pipeline from the project root:

```bash
npm run optimize:assets
```

This runs [`scripts/optimize-assets.mjs`](./optimize-assets.mjs), which:

1. Runs `npx gltf-transform optimize <in.glb> <out.glb>` and verifies the exit
   code and output existence. (Req 2.1, 2.2)
2. Compares file sizes — the optimized variant must be `≤` the source; warns if
   it is larger. (Req 2.1)
3. Applies bounding-box normalization (center → origin, largest edge → `1.0`)
   using the same transform as `lib/three/bbox.ts`. (Req 2.4)
4. On failure (non-zero exit, missing output, or normalization error), keeps the
   unoptimized source, prints a clear error, and exits non-zero. (Req 2.7)

By default it optimizes the Desktop_Model:

```
public/models/programmer_desktop_3d_pc.glb  →  public/models/programmer-desktop.optimized.glb
```

You can also pass explicit input/output paths:

```bash
npm run optimize:assets -- path/to/input.glb path/to/output.glb
```

## Public_Asset_Layout

3D assets are organized under `public/` by type: models under `public/models/`,
textures under `public/textures/`, and tech icons under `public/icons/`. (Req 2.3)

```
public/
├── models/
│   ├── programmer_desktop_3d_pc.glb        # source (input, already present)
│   ├── programmer-desktop.optimized.glb    # optimized output (Req 2.2) — REQUIRED
│   ├── cube-logo.glb                       # optional (if Cube_Logo uses a GLB)
│   └── earth.glb                           # optional (if Earth_Globe uses a GLB)
├── textures/
│   ├── terminal-screen.png                 # static texture for tier `low` (Req 5.6)
│   ├── earth.jpg                           # optional (Earth_Globe texture)
│   └── noise.png                           # material/background noise
└── icons/
    └── *.svg                               # tech icons (Tech_Icon_Card)
```

### Expected output files (Req 2.6)

| File                                      | Required | Purpose                    | Requirements  |
| ----------------------------------------- | -------- | -------------------------- | ------------- |
| `models/programmer-desktop.optimized.glb` | Yes      | Desktop_Model in Hero      | 2.2, 2.4, 2.5 |
| `models/cube-logo.glb`                    | Optional | Cube_Logo (if GLB-based)   | 2.6           |
| `models/earth.glb`                        | Optional | Earth_Globe (if GLB-based) | 2.6           |
| `textures/terminal-screen.png`            | Yes      | Terminal_Screen tier `low` | 2.6, 5.6      |
| `textures/earth.jpg`                      | Optional | Earth_Globe texture        | 2.6, 11.1     |
| `textures/noise.png`                      | Yes      | Material/background noise  | 2.6           |
| `icons/*.svg`                             | Yes      | Tech_Icon_Card             | 2.6, 7.12     |

The app loads the optimized variant when present and falls back to the source
file (with a warning) when the optimized variant is missing — see
`lib/three/assetPath.ts` (`resolveModelPath`). (Req 2.5, 2.8)
