# Panel Roles and Visibility Rules

Reference for how the CloudBlocks panel system behaves across selection states
and persona configurations.

## Bottom Panel Layout

The bottom panel contains three fixed columns:

| Column | Panel                         | Visibility                        |
| ------ | ----------------------------- | --------------------------------- |
| Left   | Minimap                       | Always visible                    |
| Center | Detail Panel (Resource Guide) | Controlled by `showResourceGuide` |
| Right  | Command Card                  | Always visible                    |

### Detail Panel (Resource Guide)

Read-only educational content. Never mutates architecture state.

| Selection State                         | Content                                                               |
| --------------------------------------- | --------------------------------------------------------------------- |
| Nothing selected, empty workspace       | Idle state with onboarding prompt                                     |
| Nothing selected, workspace has content | Workspace dashboard (container, resource, connection counts)          |
| Block selected                          | Encyclopedia entry: description, placement rules, connection patterns |
| Plate selected                          | Encyclopedia entry: layer info, subnet access type, child resources   |
| Connection selected                     | Encyclopedia entry: connection type, direction, protocol              |

Student persona adds a "Start Learning" call-to-action in the idle state.

### Command Card

Interactive action panel. Content changes based on selection context.

| Selection State     | Mode     | Content                                                    |
| ------------------- | -------- | ---------------------------------------------------------- |
| Nothing selected    | Creation | Resource buttons from Tech Tree, filtered by plate context |
| Block selected      | Action   | Link, Edit, Delete, Copy, Move, Upgrade                    |
| Plate selected      | Action   | Add Subnet, Rename, Delete, Resize                         |
| Connection selected | Action   | Change Type, Reverse, Delete                               |

In creation mode, available resources are filtered by the selected plate type:

| Plate Context         | Available Resources                                                                 |
| --------------------- | ----------------------------------------------------------------------------------- |
| Network (VNet/Region) | Public Subnet, Private Subnet, Function, Queue, Event, App Service                  |
| Public Subnet         | Storage, DNS, CDN, Front Door, VM, AKS, Container Instances, Firewall, NSG, Bastion |
| Private Subnet        | Storage, SQL, Cosmos DB, Key Vault, VM, AKS, Container Instances                    |

## Right-Side Panels

Only one right panel may be open at a time. Opening one closes the others.

| Panel        | Purpose                                         |
| ------------ | ----------------------------------------------- |
| Code Preview | Generated IaC output (Terraform, Bicep, Pulumi) |
| GitHub Login | GitHub OAuth authentication                     |
| GitHub Repos | Repository management                           |
| GitHub Sync  | Architecture sync to GitHub                     |
| GitHub PR    | Pull request creation                           |
| Suggestions  | AI-generated architecture suggestions           |
| Cost Panel   | Cost estimation                                 |

## Other Panels

| Panel             | Purpose                                       | Activation                 |
| ----------------- | --------------------------------------------- | -------------------------- |
| Block Palette     | Sidebar for drag-to-create resource placement | Toggle via toolbar         |
| Validation        | Real-time validation results                  | Toggle via toolbar         |
| Workspace Manager | Workspace CRUD overlay                        | Toggle via toolbar         |
| Template Gallery  | Architecture template selection overlay       | Toggle via toolbar         |
| Learning Panel    | Guided scenario step instructions             | Activated by Learning Mode |
| Scenario Gallery  | Learning scenario selection                   | Activated by Learning Mode |

## Persona System

### Personas and Complexity Levels

| Persona           | Complexity Level |
| ----------------- | ---------------- |
| DevOps Engineer   | advanced         |
| Backend Developer | standard         |
| Product Manager   | beginner         |
| Student           | beginner         |

### Persona Panel Defaults

When a persona is selected, these panels are toggled to their default state:

| Panel            | DevOps | Backend | PM  | Student |
| ---------------- | ------ | ------- | --- | ------- |
| Block Palette    | on     | on      | off | on      |
| Resource Guide   | on     | on      | on  | on      |
| Validation       | on     | on      | on  | on      |
| Code Preview     | on     | on      | off | off     |
| Learning Panel   | off    | off     | off | off     |
| Template Gallery | off    | off     | off | off     |

### Student Auto-Learn Behavior

When the student persona is active and the workspace is empty, the app
automatically opens Learning Mode (Learning Panel + Scenario Gallery).

### Persistence

Persona selection is stored in `localStorage` under key `cloudblocks:persona`.
On load, the complexity level is derived from the stored persona via the
persona-to-complexity mapping. If no persona is stored, persona is `null` and
complexity defaults to `standard`.
