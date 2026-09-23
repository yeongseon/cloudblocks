# Experiment: Dense and narrow inspected links

- Date / issue: 2026-09-23 / #1927
- Starting revision: `feat/1927-layered-renderer-spike` (uncommitted study)
- Question: Can a beginner follow a selected connection in a denser valid architecture at 1440 × 900 and a narrower viewport without covering blocks or labels?
- Hypothesis: Rendering one inspected link above the scene will preserve direction and type at both viewport sizes while the relationship list keeps all links discoverable.
- Baseline: unchanged five-link fixture, `?mode=three&link=app-sql`, and the production SVG capture.
- Stop condition: fail if the selected path, arrow or type label is clipped, obscures a block name, or cannot be associated with the selected relationship at either size; one session maximum.

## Controlled conditions

- Keep `src/fixture.ts` and the camera unchanged; add and validate a separate dense fixture.
- Use the same selected source/target relationship at both viewport sizes and the same capture script.
- Do not replace the production SVG baseline or change production renderer behavior.

## Evidence

| Check                                                            | Pass / fail / unknown  | Evidence                                                                                                                                                                                  |
| ---------------------------------------------------------------- | ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Dense fixture accepted by placement, import and connection rules | Pass                   | `src/denseFixture.test.ts` uses domain placement, grid/sibling spacing, production import shape and architecture validation. The original fixture is unchanged.                           |
| Selected path, arrow and type readable at 1440 × 900             | Pass for selected link | `iterations/dense-responsive/desktop-app-sql.png`: the DATA path is visible above the scene.                                                                                              |
| Selected path, arrow and type readable at narrow viewport        | Pass for selected link | `iterations/dense-responsive/narrow-app-sql.png`: the path and arrow remain visible.                                                                                                      |
| Block names and relationship list remain available at both sizes | Fail                   | Dense resource labels overlap at both sizes. At 820px the relationship inspector moves below the scene; the selected link and list entry cannot be read together in the initial viewport. |
| The unselected dense diagram remains understandable              | Unknown                | Only the selected dense link was captured; do not infer default-scene readability.                                                                                                        |
| Actual editor interactions, accessibility and performance        | Unknown                |                                                                                                                                                                                           |

## Decision

- Result: fail the combined dense-and-narrow readability hypothesis; retain the dense fixture and captures as a regression case, but do not present this as a responsive solution.
- Human visual review: the assistant inspected both generated captures. The selected path survived, but resource labels collided and the relationship inspector was below the initial narrow viewport.
- What remains untested: actual editor actions, screen-reader description, dense default scene, device frame time; no user review of this failure yet.
- Keep/remove and next single question: keep the original five-link study baseline. Next test whether a narrow layout can keep selected relationship and scene visible together without masking dense labels. Do not polish this failed candidate during the same experiment.

Captures under `iterations/` are generated locally and ignored by Git; rerun `pnpm --filter @cloudblocks/engine-spike capture` after building the production app.
