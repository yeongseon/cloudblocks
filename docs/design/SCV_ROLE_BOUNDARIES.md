# Minifigure Worker Role Boundaries

> Issue: #1030 | Milestone: 18

## Design Principle

**The minifigure is a builder — it only creates things.**

Upgrades/config happen through the resource itself (self-animation). Deletions are instant (bulldozer).

## Bottom Panel Layout (3-column, always maintained)

```
┌──────────┬──────────────────────┬─────────────────────────┐
│          │                      │                         │
│ Minimap  │ DetailPanel          │ CommandCard             │
│          │ (resource description)│ (actions + settings)   │
│          │                      │ (tall, right column)    │
└──────────┴──────────────────────┴─────────────────────────┘
```

### DetailPanel — "What is this?" (resource description, read-only)

| Selection | Content |
|-----------|---------|
| Minifigure | Worker state (idle/building), build queue, position |
| Block | Resource description (e.g. "Virtual Machine — compute instance"), Provider, Category |
| Plate | Network description, Type, Size, Contents |
| Connection | Connection description, Type, From → To |
| Nothing | Welcome / Tips |

### CommandCard — "What can I do?" (all actions + settings)

#### Minifigure selected (2-level)

Level 1:
```
┌──────────┬──────────┬──────────┐
│ Build(Q) │Connect(W)│ Move(E)  │
├──────────┼──────────┼──────────┤
│Relocate(R)│         │          │
└──────────┴──────────┴──────────┘
```

- **Build(Q)** → Level 2: resource creation grid (Back / Escape to return)
- **Connect(W)** → connection mode: select two blocks to connect
- **Move(E)** → minifigure drag repositioning
- **Relocate(R)** → select a resource then drag to reposition

Level 2 (after Build):
```
┌──────────────────────────────────┐
│ ← Back                          │
├──────────────────────────────────┤
│ Network Foundations              │
│ [VNet] [Public Sub] [Private Sub]│
│ Compute                         │
│ [VM] [AKS] [Container]          │
│ ...                             │
└──────────────────────────────────┘
```

#### Block selected
```
┌──────────┬──────────┬──────────┐
│Rename(Q) │ Copy(W)  │Delete(E) │
├──────────┼──────────┼──────────┤
│ Tier     │ Scale    │ Config   │
├──────────┼──────────┼──────────┤
│          │ [Apply]  │          │
└──────────┴──────────┴──────────┘
```

- Rename, Copy, Delete: instant execution
- Tier, Scale, Config: edit values → Apply → resource self-animation

#### Plate selected
```
┌──────────┬──────────┬──────────┐
│Rename(Q) │          │Delete(E) │
├──────────┼──────────┼──────────┤
│ Profile  │Addr Space│          │
├──────────┼──────────┼──────────┤
│          │ [Apply]  │          │
└──────────┴──────────┴──────────┘
```

#### Connection selected
```
┌──────────┬──────────┬──────────┐
│          │          │Delete(E) │
├──────────┼──────────┼──────────┤
│ Type     │          │          │
├──────────┼──────────┼──────────┤
│          │ [Apply]  │          │
└──────────┴──────────┴──────────┘
```

#### Nothing selected
Empty.

## Animation Rules

| Trigger | Animation | Actor |
|---------|-----------|-------|
| Create (Build) | walk → build → return | Minifigure |
| Apply (Upgrade/Config) | glow/pulse 1.6s | Resource self |
| Delete | fade-out instant | Resource |
| Rename/Copy | none | — |

## Game Design Reference

### StarCraft (Worker Unit)
- Worker builds. Building upgrades/researches itself. Worker never upgrades.

### SimCity
- Place → scaffolding. Upgrade → building evolves. Demolish → bulldozer instant.
