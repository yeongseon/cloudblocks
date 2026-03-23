# M17 Rendering Audit Report

**Issue**: #420 — Audit rendering code and confirm Three.js removal
**Date**: 2026-03-20
**Branch**: `audit/m17-rendering-audit`
**Epic**: #417 — Rendering Model & Package Extraction (Area A)

## Summary

CloudBlocks uses **SVG-only rendering**. Three.js has been fully removed from the codebase. No 3D dependencies, imports, or assets remain. The rendering stack is pure SVG + CSS transforms + DOM layering, driven by React components.

## Audit Results

### 1. Dependencies — CLEAN ✅

No Three.js-related packages in any `package.json`:

| Package              | Present?     |
| -------------------- | ------------ |
| `three`              | ❌ Not found |
| `@react-three/fiber` | ❌ Not found |
| `@react-three/drei`  | ❌ Not found |
| `@types/three`       | ❌ Not found |

### 2. Source Imports — CLEAN ✅

All occurrences of "three" in source files are **domain template names** (e.g., `threeTierTemplate`, `scenario-three-tier`), not library imports. Zero WebGL, Canvas 3D, or Three.js API usage found.

### 3. 3D Model Assets — CLEAN ✅

No 3D asset files exist anywhere in the repository:

| Format  | Present?     |
| ------- | ------------ |
| `.gltf` | ❌ Not found |
| `.glb`  | ❌ Not found |
| `.obj`  | ❌ Not found |
| `.fbx`  | ❌ Not found |

### 4. Current Rendering Architecture — SVG Only

The rendering stack is:

```
ArchitectureModel (3D world coordinates: x, y, z)
    ↓ worldToScreen(worldX, worldY, worldZ) — isometric projection to 2D screen coords
SVG Components (React)
    ↓ CSS transforms (zoom, pan)
DOM (browser rendering)
```

**SVG rendering entry points** (production components):

| Component           | Path                                         | Role                                                                    |
| ------------------- | -------------------------------------------- | ----------------------------------------------------------------------- |
| `SceneCanvas`       | `widgets/scene-canvas/SceneCanvas.tsx`       | Main canvas — composites all sprites into a pannable/zoomable SVG scene |
| `PlateSvg`          | `entities/plate/PlateSvg.tsx`                | Isometric plate (boundary) rendering                                    |
| `BlockSvg`          | `entities/block/BlockSvg.tsx`                | Isometric block (resource) rendering                                    |
| `ConnectionPath`    | `entities/connection/ConnectionPath.tsx`     | SVG path connections between blocks                                     |
| `MinifigureSvg`     | `entities/character/MinifigureSvg.tsx`       | Lego minifigure character sprite                                        |
| `IsometricStud`     | `shared/components/IsometricStud.tsx`        | Reusable stud component (Universal Stud Standard)                       |
| `DragGhost`         | `widgets/scene-canvas/DragGhost.tsx`         | SVG ghost during drag-to-place                                          |
| `ConnectionPreview` | `widgets/scene-canvas/ConnectionPreview.tsx` | SVG preview path during connection creation                             |
| `Minimap`           | `widgets/bottom-panel/Minimap.tsx`           | Miniature SVG overview of the canvas                                    |

### 5. Stale References Found

The original `vitest.config.ts` contained coverage exclusions referencing **deleted files** from the former Three.js/R3F era:

```typescript
// R3F/Three.js components - require WebGL context, not testable in jsdom
'src/entities/block/BlockModel.tsx',    // ← DELETED
'src/entities/plate/PlateModel.tsx',    // ← DELETED
'src/entities/connection/ConnectionLine.tsx', // ← DELETED
```

These three stale exclusions and their R3F comment have been removed by this PR.

`SceneCanvas.tsx` remains excluded with an updated comment — it is a **live production component** whose complex canvas interactions (zoom, pan, drag) require a full DOM environment not available in jsdom. Its exclusion is unrelated to Three.js.

## Conclusion

Three.js removal is **complete and verified**. The codebase is SVG-only. This audit unblocks ADR-0010 (SVG-only rendering model decision record, issue #421).

### Action Items

1. ~~Audit Three.js presence~~ — Done (this report)
2. Remove stale vitest coverage exclusions — Done (this PR)
3. Write ADR-0010 — Next issue (#421, Wave 2)
