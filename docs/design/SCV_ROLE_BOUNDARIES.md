# Minifigure Worker Role Boundaries

> Issue: #1030, #1035 | Milestone: 18

## Design Principle

**The minifigure is a builder -- it only creates things.**

Like a StarCraft worker that builds structures then walks away, the minifigure's sole job is construction. Everything else -- upgrades, configuration, settings -- happens through the resource itself via the CommandCard.

### Decision Rule

> "Is this **creating** something new?"
> - **Yes** -- Minifigure walks to site, builds it
> - **No** -- Happens via CommandCard settings panel on the resource

## CommandCard Modes

### Worker Selected: 2-Level

**Level 1 (Worker Commands):**
- Build (Q): Enter build grid (Level 2)
- Connect (W): setToolMode('connect')
- Move (E): Hint -- drag minifigure on canvas
- Relocate (R): Hint -- drag a resource to reposition

**Level 2 (Build Grid):**
- Back button returns to Level 1
- Resource creation grid (blocks only, no plates)
- Escape key returns to Level 1

### Block Selected
- Row 1: Rename(Q), Copy(W), Delete(E)
- Row 2: Tier dropdown, Scale input, Config input
- Row 3: Apply button (green)

### Plate Selected
- Row 1: Rename(Q), empty, Delete(E)
- Row 2: Profile dropdown, Address Space input
- Row 3: Apply button (green)

### Connection Selected
- Row 1: empty, empty, Delete(E)
- Row 2: Type dropdown (dataflow/http/internal/async)
- Row 3: Apply button (green)

### Nothing Selected: Creation Grid
Resource buttons with provider-specific labels.

## DetailPanel: Read-Only

The DetailPanel shows resource properties in read-only form:
- Block: Type, Description, Provider, Subtype, Category, Network, Position
- Plate: Type, Profile (text), Profile Note, Parent, Size, Contents
- Connection: Type, From, To
- Worker: State, Position, Active Build, Queued

All editing is done via CommandCard actions and settings.

## Store Additions

- `updateBlockConfig(blockId, config)` in domainSlice
- `updateConnectionType(connectionId, type)` in domainSlice
- `upgradingBlockId` + `triggerUpgradeAnimation` in uiStore (pre-existing)

## Animation Summary

| Trigger | Animation | Duration |
|---------|-----------|----------|
| Block/Plate create | Minifigure walk, build pulse, return | ~2.5s |
| Upgrade/Scale/Config Apply | Block/plate self-glow/pulse (is-upgrading) | ~1.6s |
| Delete | Instant fade-out + sound | ~0.3s |
| Rename/Copy | None | Instant |
