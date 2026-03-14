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

# Future UI Extensions

Planned UI capabilities include:

- architecture templates
- drag-and-drop library
- architecture diff view
- collaborative editing
- real-time validation
