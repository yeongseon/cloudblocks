# Experiment extension: Internet and navigation

- Date / issue: 2026-09-23 / #1927
- Question: Can the study show the canonical Internet entry point and let a learner inspect a denser scene at different scales without modifying the production renderer?
- Baseline change: the original five-link fixture now has a real root Internet resource and a validated HTTP connection to root Front Door. The dense fixture inherits both. **Regenerate all previous screenshots before comparing them with the updated fixture**; old image counts and findings describe the earlier five-link snapshot.
- Stop condition: fail if placement or connection validation rejects Internet, if Internet is absent from the production baseline, if zoom controls exceed their bounds, or if a zoomed 3D scene cannot be moved to inspect clipped resources.

## Evidence

| Check                                                                               | Result                | Evidence                                                                                                                            |
| ----------------------------------------------------------------------------------- | --------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Internet is a root external resource and Internet → Front Door is a valid HTTP link | Pass                  | `src/fixture.test.ts`, `src/denseFixture.test.ts`, production import and connection validation.                                     |
| Internet visible in 3D, SVG and actual production baseline                          | Pass                  | `iterations/zoom-baseline/rest.png`, `iterations/production-svg/rest.png`; 3D uses a neutral external-actor color.                  |
| Zoom controls on 3D and SVG are bounded                                             | Pass for controls     | `src/zoom.test.ts` and `capture.spec.ts` exercise 60%–180%, reset and both modes. This is not production zoom parity.               |
| Zoomed 3D view can be panned and reset                                              | Pass for pointer drag | `iterations/zoom-dense/zoom-in-panned.png` and `capture.spec.ts`. Pan is study-only and is not synchronized with SVG.               |
| Dense labels readable at minimum zoom                                               | Fail                  | `iterations/zoom-dense/zoom-out-internet.png`: labels collide and shrink together. Zoom out is for overview, not for reading names. |
| All resources visible at maximum zoom without panning                               | Fail by design        | `iterations/zoom-dense/zoom-in-app-sql.png`: the view clips outer resources; drag the 3D scene or reset to inspect them.            |
| Actual editing, keyboard pan, accessible text density and small-screen layout       | Unknown               | This spike does not implement production interactions or solve the earlier narrow layout failure.                                   |

## Decision

Keep Internet and bounded zoom controls in the disposable spike as navigation tools. Keep the 3D drag-to-pan as an experimental affordance, not an editor interaction guarantee. Avoid claiming that zoom repairs label collisions or relationship-list placement. The next bounded experiment should test a zoom-dependent label-density strategy while keeping a selected connection readable; do not silently change the production view.
