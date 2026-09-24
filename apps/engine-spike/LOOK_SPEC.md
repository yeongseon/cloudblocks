# Layered Visual Reference — Draft for Review

**Issue:** #1927 · **Target:** current v0.53.0 model · **Status:** Lit 3D is the user's preferred visual direction; production renderer selection remains open.

## Reference and scope

The source is the concept image shared in the discussion. There is no original image file with confirmed provenance in the repository; see `ref/README.md`. This document describes observable qualities rather than claiming pixel-accurate dimensions. After viewing the candidates, the user preferred Lit 3D visually. This preference is not approval to replace the production renderer before editor interactions and fallback are verified.

CloudBlocks remains a browser-based editor for beginners. The reference has strong material lighting and depth but also perspective, decorative controls, and visual placements that do not match current model rules. Preserve the model and editing semantics; do not reproduce the image as a UI screenshot. App Service and Functions are hosted PaaS services outside the VNet; an integration relationship is not subnet membership. See the [App Service VNet integration](https://learn.microsoft.com/en-us/azure/app-service/overview-vnet-integration) and [Functions networking](https://learn.microsoft.com/en-us/azure/azure-functions/functions-networking-options) guidance. Do not draw a fictitious VNet Integration link until the model supports that semantic.

## Visual intent

| Aspect      | Draft target                                                                                                                               | Unresolved question / check                                                     |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------- |
| Camera      | Fixed orthographic, approximately 30° elevation, with no free orbit or depth-of-field blur.                                                | Confirm apparent elevation and how zoom affects legibility.                     |
| Containment | Nested scope reads as increasingly small surfaces at higher display elevations. The root is a VNet with two subnet children.               | Is derived height alone sufficient? Check occlusion and surface selection.      |
| Surface     | Subtle semi-gloss highlight from upper left; slightly darker side walls; soft ground shadow and tighter contact shadows under children.    | Confirm required gloss and contrast in both product themes.                     |
| Resource    | Compact, uniform-height, colored resource body with an emphasized top connection point; category identity still relies on shape and color. | Check eight category colors against actual theme tokens before finalizing hues. |
| Ports       | Every displayed port remains the same three-layer glyph: rx=12, ry=6, height=5; color varies by type/state only.                           | A 3D view must specify how screen-space dimensions remain uniform under zoom.   |
| Connection  | Typed link follows a visible surface with endpoint emphasis. Avoid implying an unsupported route or protocol.                              | Compare against actual connection routing and initiator-direction validation.   |
| Labels      | Container name is visually tied to its side wall; resource name stays legible at ordinary editor zoom.                                     | Check overlapping labels, long names, keyboard focus, and high contrast.        |

All UI strings and code identifiers use **blocks, connections, surfaces, and ports**, even if the reference image uses different words. A display-only ground beneath the VNet is not a Region model node. The reference cannot add an APIM resource or place Front Door inside a subnet: `front_door` is root-only and `application_gateway` is subnet-only.

## Motion moments — proposed wording, not implemented

1. **Place:** A block aligns over a valid surface, settles with a short compression and return, and its contact shadow and port briefly intensify.
2. **Reject:** At an invalid destination the block stays suspended rather than settling; on release it returns without changing the model, while the target edge briefly signals rejection.
3. **Connect:** A typed link grows from the source port along a valid surface; a compatible destination brightens, and the link settles only when validation succeeds.
4. **Select:** The selected block lifts subtly and gains a stronger contact shadow; neighbors recede without becoming unreadable.

These are review prompts, **not** verified behavior or timing. Decide duration, easing, audio, and reduced-motion alternatives before implementation. Rejection must not animate as though the block was accepted.

## Valid common fixture

`src/fixture.ts` is the shared proposed Web API architecture. Its root `virtual_network` uses layer `region` because that is how the current schema represents the VNet; it does **not** create a separate Region parent. Subnet A contains App Gateway; Subnet B is an empty network scope. App Service, Functions, SQL Database and Key Vault are root PaaS blocks outside the VNet, alongside Internet and Front Door. The dense fixture adds a root Cache and SQL replica. Existing HTTP/DATA connections remain logical dependencies, **not** VNet Integration or private endpoint links. The six baseline typed connections are checked by the current validation engine. `src/fixture.test.ts` checks canonical type/containment, layer, grid and sibling-overlap rules and production connection validation. It does not prove Azure deployability or private networking correctness. See [the locality audit](iterations/2026-09-24-azure-locality-audit.md) for resource-by-resource evidence and model gaps.

Run `pnpm --filter @cloudblocks/engine-spike test` from the monorepo root to verify the fixture. The renderer comparison remains isolated, but PR #1929 also changed production schema rules, import validation, domain-store placement and movement, and canvas rendering for root-hosted SQL and Cache compatibility. Existing subnet placements remain supported. These changes do not migrate the production renderer or model provider-specific networking; see `REVIEW.md`.

## Comparison protocol (exploratory phase underway)

1. Use the look and motion draft as a provisional comparison target; obtain the original reference and rights/provenance before copying it or creating crops in `ref/`.
2. Record a **real production SVG capture**, rather than a reimplementation described as current SVG. Use the exact fixture and a fixed browser viewport for all candidates; do not claim identical inner-canvas framing.
3. Separately test SVG with derived elevation, orthographic lit geometry, and a genuine authored-asset hybrid if assets exist. No approximation should be labeled a prerender result.
4. For each candidate, use the same scripted actions and capture rest/place/reject/connect/select, including keyboard and WebGL-unavailable behavior. Record pass/fail/unknown for visual quality **and** editor behavior separately in a human review.
5. Timebox each candidate to one session and stop at the checklist; do not polish until a decision-driving gap is identified. Compare measured additional JS size and runtime behavior, not historical dependency estimates.
6. Only if the evidence warrants changing the production renderer, propose a new ADR to supersede ADR-0010. Do not edit an accepted ADR or bump the product version for the spike.

The current reproducible capture and its known gaps are recorded in `REVIEW.md`. It is a visual feasibility study, not a comparison of completed editor interactions.
