# Minifigure Worker Role Boundaries

> Issue: #1030 | Milestone: 18

## Design Principle

**The minifigure is a builder — it only creates things.**

Like a StarCraft worker that builds structures then walks away, the minifigure's sole job is construction. Everything else — upgrades, configuration, settings — happens through the resource itself or through UI panels.

### Decision Rule

> "Is this **creating** something new?"
> - **Yes** → Minifigure walks to site, builds it
> - **No** → Happens without the minifigure

## Game Design Precedents

### StarCraft (Worker Unit)
| Action | Who does it |
|--------|------------|
| Build structure | **Worker** walks to site, constructs |
| Upgrade building (CC → Orbital) | **Building** upgrades itself |
| Research (Stim Pack) | **Building** researches internally |
| Repair | **Worker** walks and repairs |
| Demolish | **Player** command, instant |

**Key insight**: Worker builds. Building upgrades/researches itself. Worker never upgrades.

### SimCity
| Action | Who does it |
|--------|------------|
| Place building | **Auto** — scaffolding animation |
| Upgrade building | **Building** evolves itself |
| Change settings | **Player** via UI panels |
| Demolish | **Player** bulldozer, instant |

## CloudBlocks Action Classification

### Minifigure does (walk → build animation)

**Only creation:**

| Action | Example |
|--------|---------|
| Create Block | Place a VM on a plate |
| Create Plate | Create VNet, Subnet |

That's it. The minifigure walks to the location, plays build animation, and returns to idle.

### Resource does itself (block/plate self-animation)

**Upgrades and configuration — the resource handles it internally, like a StarCraft building researching:**

| Action | Example | Animation |
|--------|---------|-----------|
| Upgrade tier | VM B1 → S1 | Block glows/pulses (upgrade effect) |
| Scale | AKS nodes 3 → 5 | Block pulses (scale effect) |
| Network config | Open port 443 on NSG | Block briefly flashes |
| Firewall rule | Add allow rule | Block briefly flashes |
| Expand VNet | Add address space | Plate glows/expands |

These are triggered from the **Properties panel** (right side). User edits settings, clicks Apply, and the block/plate plays its own animation.

### Instant (no animation)

**Metadata and UI actions:**

| Action | Where |
|--------|-------|
| Rename | Properties panel |
| Tags | Properties panel |
| Description | Properties panel |
| Copy/Duplicate | Properties panel |
| Delete | CommandCard or keyboard (bulldozer, instant fade-out) |

## UI Surface Responsibilities

```
┌─────────────────────────────────────────────────────┐
│ Menu Bar                                            │
├────────┬─────────────────────────────┬──────────────┤
│        │                             │              │
│Resource│    Canvas (READ-ONLY)       │  Properties  │
│  Bar   │                             │   Panel      │
│        │  - Select → show in Props   │              │
│        │  - Drag to reposition       │  Metadata:   │
│        │  - View only, no editing    │  - Rename    │
│        │                             │  - Tags      │
│        │         🧱 minifigure       │  - Copy      │
│        │         (walks & builds)    │              │
│        │                             │  Infra:      │
│        │                             │  - Tier/SKU  │
│        │                             │  - Scale     │
│        │                             │  - Config    │
│        │                             │  - [Apply]   │
├────────┴─────────────────────────────┴──────────────┤
│ CommandCard (Bottom Panel)                          │
│                                                     │
│ Nothing selected: [Resource creation grid]          │
│ Block selected:   [Delete]                          │
│ Plate selected:   [Delete]                          │
│                                                     │
│ Create → minifigure walks & builds                  │
│ Delete → instant bulldozer (no walk)                │
└─────────────────────────────────────────────────────┘
```

### Canvas (center)
- **Read-only** for content editing
- Select block/plate → Properties panel shows details
- Drag block/plate → reposition (layout only, not infra change)
- Connect mode → draw connections via tool mode
- No inline rename, no property editing on canvas

### Properties Panel (right)
- **All editing happens here**
- Metadata (Rename, Tags, Description) → instant save
- Infrastructure settings (Tier, Scale, Config) → Apply button → resource self-animates
- Copy/Duplicate → trigger here
- Auto-opens when a block/plate is selected

### CommandCard (bottom)
- **Creation mode** (nothing selected): Resource grid for placing new blocks/plates → minifigure builds
- **Selected mode**: Only Delete action (instant bulldozer)
- No Upgrade/Scale/Config buttons — those are in Properties panel
- No Rename/Copy/Link/Edit — those are in Properties panel

## CommandCard Action Grid (Revised)

### Nothing selected → Creation Grid
Resource buttons with provider-specific labels (current behavior, correct).
Clicking a resource → minifigure walks to plate, builds the block.

### Block selected
| Slot | Action | Hotkey |
|------|--------|--------|
| 1 | — | — |
| 2 | — | — |
| 3 | Delete | E |

Minimal grid. Most actions moved to Properties panel.

### Plate selected
| Slot | Action | Hotkey |
|------|--------|--------|
| 1 | — | — |
| 2 | — | — |
| 3 | Delete | E |

### Removed from CommandCard
| Action | Moved to | Reason |
|--------|----------|--------|
| Deploy | Ops Control Center | Not a resource action |
| Link | Connect tool mode | Separate interaction |
| Edit | Properties panel | Auto-open on select |
| Rename | Properties panel | Metadata edit |
| Copy | Properties panel | Meta operation |
| Upgrade | Properties panel + Apply | Resource self-upgrades |
| Scale | Properties panel + Apply | Resource self-scales |
| Config | Properties panel + Apply | Resource self-configures |

## Animation Summary

| Trigger | Animation | Duration |
|---------|-----------|----------|
| Block/Plate **create** | Minifigure walk → build pulse → return | ~2.5s |
| **Upgrade/Scale/Config** Apply | Block/plate self-glow/pulse | ~1s |
| **Delete** | Instant fade-out + sound | ~0.3s |
| **Rename/Tags/Copy** | None | Instant |

## Implementation Plan

### Phase 1: Clean up CommandCard actions
1. Remove `Deploy` from `PLATE_ACTION_DEFINITIONS` and `PLATE_ACTION_GRID`
2. Remove `Link`, `Edit`, `Rename`, `Copy` from `ACTION_DEFINITIONS` and `ACTION_GRID`
3. Simplify block/plate action grids to Delete only

### Phase 2: Properties panel enhancements
4. Auto-open Properties panel on block/plate selection
5. Add Rename field to Properties panel
6. Add Copy/Duplicate button to Properties panel
7. Add infrastructure settings section (Tier, Scale, Config) with Apply button

### Phase 3: Resource self-animation
8. Add `is-upgrading` CSS animation to BlockSprite (glow/pulse effect)
9. Wire Properties Apply → block/plate self-animation trigger
10. Add sound effects for upgrade/config actions

### Phase 4: Plate creation animation
11. Wire plate creation through minifigure (currently instant)
12. Minifigure walks to plate position, build animation, plate materializes
