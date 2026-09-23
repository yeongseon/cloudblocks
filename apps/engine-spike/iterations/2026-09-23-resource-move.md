# Experiment: Moving a resource in Lit 3D

- Date / issue: 2026-09-23 / #1927
- Candidate: drag one existing resource on its current parent surface without changing the saved comparison fixtures
- Question: Can a learner move a block in Lit 3D while the grid, valid placement and connected visuals remain consistent with the model?
- Hypothesis: A grid-snapped move within the current parent can update the block and its relationships together; an invalid move will leave the block at its last valid position.
- Baseline: validated baseline and dense fixtures, existing scene pan and selected-link inspector
- Stop condition: fail if a move overlaps a sibling, escapes its parent, pans the camera instead, leaves a connection at the old position, or persists into the fixture used for comparison.

## Controlled conditions

- Keep both fixture definitions and production renderer unchanged.
- Test ordinary, zoomed and panned Lit 3D scenes against the same fixture; do not mistake pointer drag for the illustrative Place/Reject buttons.
- Use the production validation rules rather than inventing separate placement semantics. Cross-container moves and container resizing are out of scope for this single iteration.

## Evidence

| Check                                                            | Pass / fail / unknown                  | Evidence                                                                                                                                                              |
| ---------------------------------------------------------------- | -------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Grid-aligned in-parent move stays visible after drag             | Pass for App Service                   | `iterations/resource-move/accepted.png`, browser check confirms snapped grid 4,-5 and reload restores the fixture.                                                    |
| Invalid parent-boundary or sibling overlap is rejected           | Pass for overlap; boundary unit-tested | `iterations/resource-move/rejected.png` confirms no move and unchanged inspected path. `src/movement.test.ts` rejects a parent escape.                                |
| Connected surface paths and inspected link track the moved block | Pass after drop                        | Browser test compares the selected `app-sql` path before and after drag; remount recomputes the 3D rails and SVG paths. Rails do not follow the preview continuously. |
| Empty-space drag still pans without moving a resource            | Pass                                   | Zoom/pan browser test; pointer-start raycasting separates resource drag from empty-space pan.                                                                         |
| Same behavior after zoom or camera pan                           | Pass for one 140% drag                 | `iterations/resource-move/zoomed-panned.png` and browser test.                                                                                                        |
| Keyboard movement and real editor interaction parity             | Unknown                                | No keyboard movement, parent transfer, production store writes, undo/redo or container resize.                                                                        |

## Decision

- Result: keep same-parent movement as a bounded Lit 3D study, not as a product feature.
- Visual review and regression evidence: the assistant inspected accepted, rejected and zoomed/panned captures. The block and selected-link endpoint relocate together after an accepted drop; a rejected overlap restores both. Focused Playwright and unit placement tests pass.
- Known limitations and next single question: preview rails do not follow continuously during drag; transfer between containers, keyboard input, undo and serialization remain unknown. Next test continuous connection geometry during a drag without compromising rejection or camera pan.

Screenshots in `iterations/` are generated locally and ignored by Git. This record is for a disposable interaction spike, not approval to replace the product renderer.
