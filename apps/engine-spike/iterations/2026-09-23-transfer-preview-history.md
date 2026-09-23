# Experiment: Transfer, preview and move history

- Date / issue: 2026-09-23 / #1927
- Candidate: transient parent-aware placement, live affected-link preview, keyboard/button movement and undo/redo in the isolated Lit 3D study
- Question: Can a resource be moved between valid subnets while the user sees connected link feedback and can reverse the action, without mutating the fixed comparison fixture?
- Hypothesis: storing parent and relative grid position per moved resource lets a single study move update block, labels, links and history atomically; rejected drops leave committed state untouched.
- Baseline: `?mode=three&link=app-sql` with validated baseline fixture, zoom/pan and same-parent movement.
- Stop condition: fail if a valid move loses any connected path, an invalid move alters state/history, camera pan starts when grabbing a block, undo/redo cannot restore parent and path, or the fixture changes after reload.

## Controlled conditions

- Both fixture definitions stay unchanged. The 3D study stores only transient parent/position overrides, and products in `apps/web` are not migrated.
- Test App Gateway from App Subnet to Data Subnet, and SQL Database rejected when dragged onto a subnet. App Service/Functions and SQL/Key Vault/Cache remain root PaaS resources in this Azure study. Use ordinary and zoomed/panned scenes.
- Production rules are consulted for resource parent legality, grid, sibling collision and boundaries. Destination transfers choose a new free slot; they do not preserve old relative coordinates.

## Evidence

| Check                                                          | Pass / fail / unknown                    | Evidence                                                                                                                              |
| -------------------------------------------------------------- | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Same-parent move and collision rejection                       | Pass                                     | Browser accepted/rejected move tests and `src/movement.test.ts`.                                                                      |
| App Gateway transfers to Data Subnet by drag                   | Pass for fixed fixture                   | `iterations/resource-move/transfer-preview.png`, cross-subnet browser test and moved-parent message.                                  |
| Links update during preview and after drop                     | Pass for connected paths in this fixture | Selected inspection path changes during drag; only affected 3D rails are replaced by lighter preview rails. Other rails stay visible. |
| Invalid SQL subnet drop leaves state and history unchanged     | Pass                                     | Invalid cross-parent browser test checks unchanged path, move count and disabled Undo.                                                |
| Undo/redo restores transferred parent and path                 | Pass                                     | Button and Ctrl/Cmd+Z / Shift+Ctrl/Cmd+Z browser checks.                                                                              |
| Keyboard and visible buttons nudge selected block              | Pass for one valid grid move             | Arrow shortcut and labeled nudge-button browser tests. Keyboard shortcut does not intercept select/input or button focus.             |
| Zoom/pan before moving remains usable                          | Pass for a same-parent move              | `iterations/resource-move/zoomed-panned.png` and browser regression. Cross-parent move after pan was not separately captured.         |
| Production parity, arbitrary graphs, screen-reader exploration | Unknown                                  | Study-only state; production code, dynamic container sizing and full assistive review remain outside this experiment.                 |

## Decision

- Result: keep the bounded interaction study. It is not approved production editor behavior.
- Human visual review: the assistant inspected transfer and preview captures. A destination slot selection near the back of the Data Subnet avoids immediate visual overlap with SQL but dense fixtures still need separate review.
- Limitations: source and destination labels can still occlude at small zoom; no model history integration, serialization, container resizing, or automated drag into every supported parent. The App Gateway transfer demonstrates UI mechanics, not a valid Azure deployment: gateways require a dedicated subnet. A transfer to root is permitted only when the canonical type rule allows it and a root location avoids the network surface.
- Next single question: can the same parent-aware move and preview remain understandable with the dense fixture and smaller viewport, including keyboard focus and collision feedback?

Captures in `iterations/` are ignored; regenerate with `pnpm --filter @cloudblocks/engine-spike capture`. This is not permission to replace the current product renderer.
