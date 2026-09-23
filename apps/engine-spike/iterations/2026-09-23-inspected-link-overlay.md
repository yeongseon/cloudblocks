# Experiment: Inspected link overlay

- Date / issue: 2026-09-23 / #1927
- Starting branch or revision: feat/1927-layered-renderer-spike, current uncommitted study baseline
- Candidate: show one selected, directional link in a screen-space inspection corridor instead of adding more 3D connector geometry
- Question: Can a beginner follow a selected root-to-subnet or cross-subnet connection from source to target on the scene, without hiding or covering the blocks?
- Hypothesis: If only the inspected relationship receives a directional above-scene path, a learner can trace that connection without adding persistent geometry over the blocks.
- Baseline: current Lit 3D surface rails with the relationship inspector and the production SVG capture from the same fixture
- Stop condition: fail if either representative link disappears behind a surface, a link crosses block/label faces, or direction/type cannot be identified from the scene; one session maximum

## Setup and changes

- Files changed: `src/inspectionPath.ts`, `src/inspectionPath.test.ts`, `src/three.ts`, `src/main.ts`, `src/style.css`, `capture.spec.ts`
- Controlled conditions: unchanged fixture, fixed 1440 × 900 browser viewport, orthographic camera, and Playwright capture sequence. The only visual change is the selected-link inspection overlay.
- Comparison states: `?mode=three` (base rails) and `?mode=three&link=app-sql` (selected-link overlay); repeat for `gateway-app` and `front-gateway`.
- Fixture: `src/fixture.ts` unchanged
- Viewport and capture commands: 1440 × 900, `pnpm build`, `pnpm --filter @cloudblocks/engine-spike test`, `pnpm --filter @cloudblocks/engine-spike build`, `pnpm --filter @cloudblocks/engine-spike capture`
- Reference and license: no original asset available; compare against the validated fixture and current captured baseline

## Evidence

| Check                                           | Pass / fail / unknown  | Evidence (capture path, test output, or observation)                                                                                                                           |
| ----------------------------------------------- | ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Source, target, direction, type readable        | Pass for selected link | `iterations/inspection-overlay/{gateway-app,front-gateway,app-sql}.png`: directional path to existing standard-size top ports, type label, and names in the relationship list. |
| Same-subnet route visible without overlap       | Pass for selected link | `iterations/inspection-overlay/gateway-app.png`: selected path stays above resource bodies.                                                                                    |
| Root-to-subnet route traceable                  | Pass for selected link | `iterations/inspection-overlay/front-gateway.png`: both endpoints are visible.                                                                                                 |
| Cross-subnet route traceable                    | Pass for selected link | `iterations/inspection-overlay/app-sql.png`: selected path does not disappear behind either subnet.                                                                            |
| Denser graph remains readable                   | Unknown                |                                                                                                                                                                                |
| Actual place, reject, connect, select, zoom/pan | Unknown                |                                                                                                                                                                                |
| Keyboard, reduced motion, WebGL fallback        | Partial                | Relationship items are native buttons; existing fallback test passes. Full keyboard navigation and an alternative path description remain unknown.                             |
| Loaded bytes and frame time on target device    | Unknown                |                                                                                                                                                                                |

## Decision

- Result: keep as an optional inspected-link study, not as a replacement for physical routing
- Why (include failures, not only successes): three selected fixture links remain unobstructed in screenshots; the overlay is screen-space rather than a physically attached route and may look detached from the layered model. A dense graph cannot be judged from these captures.
- Human visual review: the assistant inspected the generated `gateway-app`, `front-gateway`, and `app-sql` captures; the user responded positively to the selected-link example. Neither review tested real editor interactions.
- What remains untested: actual link creation/selection in the editor, keyboard description of the path, zoom/pan, dense graphs, runtime performance
- `REVIEW.md` entry and issue comment: see the bounded follow-up entry in `REVIEW.md` and issue #1927
- Next single question: can an inspected-link overlay remain legible with a denser fixture and smaller viewport without covering blocks or labels?

Generated screenshots under `iterations/` are ignored by Git; rerun the capture command to reproduce them. This note does not authorize production renderer changes.
