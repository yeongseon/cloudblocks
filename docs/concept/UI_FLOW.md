# CloudBlocks UI Flow

This document describes the primary user interaction flows of the CloudBlocks visual architecture builder.

CloudBlocks uses a Lego-style visual builder where users assemble infrastructure components and the system translates them into architecture models.

---

# High-Level User Flow

Landing
→ Workspace creation
→ Visual architecture editor
→ Architecture validation
→ Infrastructure generation

---

# Workspace Creation

Users begin by creating or selecting a workspace.

Flow:

Landing Page  
→ Create Workspace  
→ Open Architecture Editor

---

# Plate Creation

Users create infrastructure boundaries using plates.

Example plates:

- VPC
- Subnet
- Network Zone

Flow:

Add Plate  
→ Select Plate Type  
→ Place Plate on Canvas

---

# Block Creation

Blocks represent deployable infrastructure components.

Examples:

- compute
- database
- storage
- gateway

Flow:

Add Block  
→ Select Block Category  
→ Drag Block into Plate

---

# Connection Creation

Connections represent communication flows.

Flow:

Select Source Block  
→ Select Target Block  
→ Create Connection

Example:

gateway → compute  
compute → database  

---

# Architecture Validation

Users can validate architecture designs before generating infrastructure code.

Flow:

Edit Architecture  
→ Run Validation  
→ Display Errors / Warnings

Example validation message:

database cannot connect to internet

---

# Infrastructure Generation

Users generate infrastructure code from architecture models.

Flow:

Generate Infrastructure  
→ Select Provider  
→ Export IaC

Supported formats:

- Terraform
- Bicep
- Pulumi

---

# Implemented UI Extensions

The following capabilities have been delivered across various milestones:

- ✅ Architecture templates (Milestone 4)
- ✅ Drag-and-drop from CommandCard palette (Milestone 6B)
- ✅ Architecture diff view (Milestone 7)
- ✅ Real-time validation (Milestone 1+)
- ✅ Toast notifications replacing alert() dialogs (Phase 11)
- ✅ Connection selection and deletion (Phase 11)
- ✅ Learning Mode with guided scenarios (Milestone 6C)
- ✅ BottomPanel / CommandCard interaction model (Phase 9)

# Future UI Extensions

Planned UI capabilities include:

- Collaborative editing
- Provider mode toggle (multi-cloud context switching)
- Architecture simulation visualization
- Deployment status dashboard
