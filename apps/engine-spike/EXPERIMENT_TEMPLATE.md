# Experiment: <short English name>

- Date / issue: YYYY-MM-DD / #1927
- Starting branch or revision: <revision>
- Candidate: <one change in apps/engine-spike>
- Question: Can a beginner <observable action or reading task> better than in the current baseline?
- Hypothesis: If <one visual/interaction change>, then <observable improvement> without <specific regression>.
- Baseline: current Lit 3D + relationship inspector; production SVG capture from the same validated fixture
- Stop condition: fail if <observable defect>; pass the narrow hypothesis only if <observable result>. One session maximum.

## Setup and changes

- Files changed:
- Controlled conditions: same validated fixture, browser viewport, camera, interaction sequence, and capture settings unless the question explicitly tests one of these. Name every deliberate exception.
- Comparison states: <baseline URL and candidate URL, or controls for both states>
- Fixture: `src/fixture.ts` unchanged / additional separately validated denser fixture
- Viewport and capture commands: 1440 × 900, `pnpm build`, `pnpm --filter @cloudblocks/engine-spike test`, `pnpm --filter @cloudblocks/engine-spike build`, `pnpm --filter @cloudblocks/engine-spike capture`
- Reference and license: conversation image only / original with provenance in `ref/`

## Evidence

| Check                                           | Pass / fail / unknown | Evidence (capture path, test output, or observation) |
| ----------------------------------------------- | --------------------- | ---------------------------------------------------- |
| Source, target, direction, type readable        | Unknown               |                                                      |
| Same-subnet route visible without overlap       | Unknown               |                                                      |
| Root-to-subnet route traceable                  | Unknown               |                                                      |
| Cross-subnet route traceable                    | Unknown               |                                                      |
| Denser graph remains readable                   | Unknown               |                                                      |
| Actual place, reject, connect, select, zoom/pan | Unknown               |                                                      |
| Keyboard, reduced motion, WebGL fallback        | Unknown               |                                                      |
| Loaded bytes and frame time on target device    | Unknown               |                                                      |

## Decision

- Result: keep candidate / remove candidate / unknown
- Why (include failures, not only successes):
- Human visual review: <who inspected which generated images and what they observed>
- What remains untested:
- `REVIEW.md` entry and issue comment:
- Next single question:

Generated screenshots under `iterations/` are ignored by Git; rerun the capture command to reproduce them. This note is evidence of an experiment, not permission to change the production renderer.
