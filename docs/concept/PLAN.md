# Active Plan

> Updated 2026-09-25 against merged `main`. This is a small work queue, not a release schedule. The [Roadmap](https://github.com/yeongseon/cloudblocks/blob/main/docs/concept/ROADMAP.md) holds product direction; completed milestones stay in the history archive. Revisit this page at the end of each work burst.

## Now (maximum 3)

1. [#1941 — Score the rendering study](https://github.com/yeongseon/cloudblocks/issues/1941). Compare production SVG and Lit 3D with the same real editor actions, fixtures, viewport and measurable performance/a11y checks. The existing [REVIEW](https://github.com/yeongseon/cloudblocks/blob/main/apps/engine-spike/REVIEW.md) and 26 passing capture tests are **not** action parity. A human records the visual verdict and go/no-go on drafting ADR-0020; stop adding study features until scoring is complete.
2. [#1940 — Decide connection visibility](https://github.com/yeongseon/cloudblocks/issues/1940). Compare selected-link inspection, a visible edge corridor and restrained stacking on the dense 11-resource/14-link fixture. Record comparable captures, measurable failures and the human verdict independently of renderer choice.
3. [#1936 — Correct wrong-service Terraform mappings](https://github.com/yeongseon/cloudblocks/issues/1936). The [#1937](https://github.com/yeongseon/cloudblocks/issues/1937) CLI gate now validates all six built-in Azure exports, but schema-valid HCL may still select the wrong service. Replace or explicitly block misleading mappings, verify dependencies and keep [provider support](../user-guide/provider-support.md), README and the V1 contract aligned. No plan/apply guarantee follows from validation alone.

## Next (maximum 10)

1. [#1928 — Azure network attachment fidelity](https://github.com/yeongseon/cloudblocks/issues/1928). Keep hosted PaaS at root; model explicit private endpoint targets and outbound integration separately from logical HTTP/DATA flow. Test dedicated Gateway subnet rules and saved-workspace compatibility. Audit six templates and export semantics.
2. [#1916 — Decide V1 beta readiness](https://github.com/yeongseon/cloudblocks/issues/1916). Measure product flow, performance/security and feedback route before any version bump, tag or prerelease. Plausible is not configured. A human owns the release decision.
3. Draft ADR-0020 only if #1941 receives a human go verdict; explain how it supersedes ADR-0010/0018. Do not change the production renderer first.
4. After a go and accepted ADR, scaffold a default-SVG `VITE_RENDERER` flag at `SceneCanvas`; then build separate vertical-slice PRs for placement, nesting, connection interleaving, accessible labels and both themes.
5. Review root-resource auto-size on reparent, keyboard editing and persistence round-trip as separate product issues.
6. Acquire provenance and reuse rights before committing the original visual reference and its crops.
7. Choose and verify live-demo feedback collection. Plausible needs an actual account, script and observed `template_loaded`/`code_generated` events; otherwise document manual feedback.
8. Generate a short README demo capture after the production template→edit→export path is verified.
9. Retire the engine-spike CI job only in the same PR that ends/archives the study; remove obsolete tool-specific planning residue separately.

## Later (decisions, not tasks)

- Decide whether to keep-and-freeze, split or archive `apps/api` and the unused infrastructure before V3 work.
- Advance V2 Export from validated templates toward plan/scaffolding only after networking fidelity and real feedback evidence. Do not promote Bicep/Pulumi or start i18n as part of this queue.
- A v1.0.0 release requires a human decision against the V1 contract; routine work stays in v0.x and does not trigger a version bump.

## Handoff

**2026-09-24:** `main` has merged #1938 (honest export claims) and Dependabot #1921/#1923/#1924/#1926/#1922; `pnpm test` passed after the UUID and ELK majors. #1912/#1828 were already closed. The governance patch `0001-docs-governance-*.patch` was not found and was not applied. #1919/#1920/#1925 still have failing checks; Dependabot rebase was requested. Renderer capture passed 26 tests but action parity and the human verdict remain unknown. Local Terraform CLI is unavailable (Homebrew blocked by Xcode license), so #1937 remains open. **Next action:** run a bounded #1941 parity/measurement session without adding study features, then request the human visual verdict.

**2026-09-25:** #1943 merged and closed #1937. A checksum-verified Terraform 1.16.4 binary ran locally without Homebrew; all six built-in Azure exports passed real `init -backend=false` and `validate` with AzureRM 3.117.1 locally and in required Linux CI. Generator fixes address schema errors, **not** wrong-service mappings (#1936), Azure plan/apply or #1928 network semantics. Full web suite: 3,647 tests; branch coverage: 90.09%. #1919/#1920/#1925 remain blocked by failing checks; #1940/#1941 still need human visual decisions. **Next action:** finish #1941's same-action SVG/Lit measurements, then request a human go/no-go without adding study features.
