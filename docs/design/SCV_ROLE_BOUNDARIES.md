# CommandCard Role Boundaries

> Issue: #1088 | Milestone: 19

## Design Principle

**The CommandCard is a context-sensitive action panel** — it displays relevant actions and settings based on what the user has selected on the canvas.

### Decision Rule

> "What is currently selected?"
> - **Block** — Show block actions (rename, copy, delete) and configuration form
> - **Plate** — Show plate actions (rename, delete) and settings form
> - **Connection** — Show connection actions (delete) and type dropdown
> - **Nothing** — Show an empty hint prompting the user to select something

## CommandCard Modes

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

### Nothing Selected: Empty Hint
Displays a message prompting the user to select a block, plate, or connection.

## DetailPanel: Read-Only

The DetailPanel shows resource properties in read-only form:
- Block: Type, Description, Provider, Subtype, Category, Network, Position
- Plate: Type, Profile (text), Profile Note, Parent, Size, Contents
- Connection: Type, From, To

All editing is done via CommandCard actions and settings.

## Store Additions

- `updateBlockConfig(blockId, config)` in domainSlice
- `updateConnectionType(connectionId, type)` in domainSlice
- `upgradingBlockId` + `triggerUpgradeAnimation` in uiStore (pre-existing)

## Animation Summary

| Trigger | Animation | Duration |
|---------|-----------|----------|
| Upgrade/Scale/Config Apply | Block/plate self-glow/pulse (is-upgrading) | ~1.6s |
| Delete | Instant fade-out + sound | ~0.3s |
| Rename/Copy | None | Instant |
