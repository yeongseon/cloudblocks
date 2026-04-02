# Scenario Language Review Checklist

> Covers issue #1486 — review all guided scenario content for beginner-appropriate language.
>
> **Status**: In progress — initial review complete for three-tier scenario. Remaining scenarios pending review.

## 1. Review Criteria

Every step title, instruction, hint, and description across all guided scenarios must satisfy these 7 criteria:

| #   | Criterion                           | Pass                                                                                                | Fail Example                                            |
| --- | ----------------------------------- | --------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| 1   | **One action per step**             | "Create a Network container."                                                                       | "Create a Network container and add two Subnets."       |
| 2   | **Explain jargon on first use**     | "Add a Subnet (a segment of your network with its own IP range)."                                   | "Add a Subnet." (no explanation)                        |
| 3   | **No condescending filler**         | "Click the Network button to add a container."                                                      | "Simply click the Network button — it's easy!"          |
| 4   | **Max 2 sentences per instruction** | "Place an Azure Load Balancer on Subnet 1. This routes incoming traffic to your compute resources." | Three or more sentences with nested clauses.            |
| 5   | **Action-oriented titles**          | "Create the Network"                                                                                | "Network Configuration"                                 |
| 6   | **Consistent terminology**          | Always "container" (not "boundary" or "box" or "region" interchangeably)                             | Mixed terms for the same concept.                       |
| 7   | **Progressive complexity**          | Step 1 introduces one concept; Step 5 combines concepts.                                            | Step 1 references advanced concepts not yet introduced. |

---

## 2. Scenario Review: Three-Tier Web Application

**ID**: `scenario-three-tier`
**Difficulty**: Beginner
**Steps**: 5

### Step 1: Create the Network

| Field       | Content                                                                                                             | Criteria Check                                 |
| ----------- | ------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| Title       | "Create the Network"                                                                                                | ✅ Action-oriented (#5)                        |
| Instruction | "Create a Network container as the foundation for your cloud architecture."                                         | ✅ Single action (#1), ✅ max 2 sentences (#4) |
| Hint 1      | "A Network container represents a Virtual Network (VNet) - the isolated network boundary for your cloud resources." | ✅ Explains jargon (#2): VNet defined          |
| Hint 2      | "Click the Network container button in the Command Card to add one to the canvas."                                  | ✅ Action-oriented, no filler (#3)             |

**Issues**: None.

### Step 2: Add Subnets

| Field       | Content                                                                            | Criteria Check                                                                           |
| ----------- | ---------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Title       | "Add Subnets"                                                                      | ✅ Action-oriented (#5)                                                                  |
| Instruction | "Add two Subnets inside your Network."                                             | ✅ Single action (#1), ✅ concise (#4)                                                   |
| Hint 1      | "Subnets divide your network into segments with separate IP ranges."               | ✅ Explains jargon (#2)                                                                  |
| Hint 2      | "In Azure, access control is managed by NSG and route tables, not by subnet type." | ⚠️ **"NSG"** not explained on first use (#2). Should say "Network Security Group (NSG)". |
| Hint 3      | "Add two subnets from the Command Card."                                           | ✅ Action-oriented (#3)                                                                  |

**Issues**:

- [ ] Hint 2: Expand "NSG" to "Network Security Group (NSG)" → **Follow-up needed**

### Step 3: Place Your Resources

| Field       | Content                                                                                 | Criteria Check                                                                                                                  |
| ----------- | --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Title       | "Place Your Resources"                                                                  | ✅ Action-oriented (#5)                                                                                                         |
| Instruction | "Place an Azure Load Balancer, an Azure VM, and an Azure SQL Database on your subnets." | ⚠️ Three actions in one step (#1). However, this is step 3 of a beginner scenario — progressive complexity (#7) may justify it. |
| Hint 1      | "Gateways are the entry point for internet traffic."                                    | ⚠️ Uses "Gateways" but the instruction says "Azure Load Balancer". Terminology mismatch (#6).                                   |
| Hint 2      | "Databases should be isolated from direct internet exposure using NSG rules."           | ⚠️ "NSG rules" — still unexpanded at this point (#2).                                                                           |
| Hint 3      | "Compute nodes can be on any subnet."                                                   | ✅ Clear and concise                                                                                                            |

**Issues**:

- [ ] Hint 1: Change "Gateways" to "The Load Balancer" for consistency with the instruction (#6)
- [ ] Hint 2: Expand "NSG rules" to "Network Security Group (NSG) rules" (#2)
- [ ] Instruction: Consider splitting into two steps if user testing shows confusion (#1)

### Step 4: Connect the Data Flow

| Field       | Content                                                                                                    | Criteria Check                                                                                                             |
| ----------- | ---------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Title       | "Connect the Data Flow"                                                                                    | ✅ Action-oriented (#5)                                                                                                    |
| Instruction | "Connect Internet -> Azure Load Balancer -> Azure VM -> Azure SQL Database to establish the request flow." | ⚠️ Long compound action, but the arrow notation makes it scannable. Acceptable for step 4 (#7 progressive complexity).     |
| Hint 1      | "Use Connect mode to draw connections between resources."                                                  | ✅ Action-oriented                                                                                                         |
| Hint 2      | "The data flow represents request direction: Internet -> Gateway -> Compute -> Database."                  | ⚠️ Switches back to generic terms ("Gateway", "Compute", "Database") while the instruction uses Azure-specific names (#6). |
| Hint 3      | "Click the source block first, then click the target block to create a connection."                        | ✅ Clear, step-by-step                                                                                                     |

**Issues**:

- [ ] Hint 2: Use consistent naming — match the instruction's Azure-specific names (#6)

### Step 5: Validate Your Architecture

| Field       | Content                                                                                       | Criteria Check                                                                                                            |
| ----------- | --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Title       | "Validate Your Architecture"                                                                  | ✅ Action-oriented (#5)                                                                                                   |
| Instruction | "Ensure your architecture passes all validation rules."                                       | ⚠️ "Ensure" is vague — should specify what to click (#3). Better: "Open the Validation panel to check your architecture." |
| Hint 1      | "Open the Validation panel to see any errors."                                                | ✅ Action-oriented                                                                                                        |
| Hint 2      | "All blocks must be on valid plates, and all connections must follow the allowed flow rules." | ⚠️ "valid plates" — unexplained term (#2). Should use "containers" or "subnets" instead.                                  |

**Issues**:

- [ ] Instruction: Make action-oriented ("Open the Validation panel to check your architecture.") (#3)
- [ ] Hint 2: Replace "valid plates" with "the correct containers" (#2, #6)

---

## 3. Scenario Review: Serverless HTTP API

**ID**: `scenario-serverless-api`
**Difficulty**: Intermediate
**Steps**: 4

### Step 1: Set Up Network Zones

| Field       | Content                                                               | Criteria Check                             |
| ----------- | --------------------------------------------------------------------- | ------------------------------------------ |
| Title       | "Set Up Network Zones"                                                | ✅ Action-oriented (#5)                    |
| Instruction | "Add two Subnets — one for the gateway and one for data services."    | ✅ Single action (#1), ✅ explains purpose |
| Hint 1      | "Even in serverless architectures, you need network boundaries."      | ✅ Contextual explanation                  |
| Hint 2      | "Use separate subnets to segment gateway traffic from data services." | ✅ Explains reasoning                      |

**Issues**: None.

### Step 2: Deploy Serverless Components

| Field       | Content                                                                                                                                     | Criteria Check                                                                                  |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Title       | "Deploy Serverless Components"                                                                                                              | ✅ Action-oriented (#5)                                                                         |
| Instruction | "Place an Azure Application Gateway on a subnet, an Azure Functions block on the network container, and an Azure SQL Database on a subnet." | ⚠️ Three actions in one instruction (#1). For intermediate difficulty, this is acceptable (#7). |
| Hint 1      | "Functions are serverless compute - they run on the Network container, not a specific subnet."                                              | ✅ Explains placement rule with clear reason                                                    |
| Hint 2      | "The Gateway receives HTTP requests and routes them to your Function."                                                                      | ✅ Clear data flow explanation                                                                  |
| Hint 3      | "Place the Database on a subnet for security."                                                                                              | ✅ Concise with reason                                                                          |

**Issues**: None — the multi-action instruction is appropriate for intermediate difficulty.

### Step 3: Wire the API Flow

| Field       | Content                                                                                                | Criteria Check                         |
| ----------- | ------------------------------------------------------------------------------------------------------ | -------------------------------------- |
| Title       | "Wire the API Flow"                                                                                    | ✅ Action-oriented (#5)                |
| Instruction | "Connect Internet -> Azure Application Gateway -> Azure Functions -> Azure SQL Database."              | ✅ Clear arrow notation                |
| Hint 1      | "The serverless flow: HTTP request hits the Gateway, triggers a Function, which queries the Database." | ✅ Explains the flow in plain language |
| Hint 2      | "Functions can connect to databases, storage, and queues."                                             | ✅ Broadens knowledge                  |

**Issues**: None.

### Step 4: Validate

| Field       | Content                                                                                | Criteria Check                                                                |
| ----------- | -------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| Title       | "Validate"                                                                             | ⚠️ Bare verb — could be "Validate Your API Architecture" for consistency (#5) |
| Instruction | "Check that your serverless architecture is valid."                                    | ⚠️ Same issue as Three-Tier step 5 — should specify what to click (#3)        |
| Hint 1      | "Make sure all placements and connections follow the rules."                           | ✅ Clear                                                                      |
| Hint 2      | "Use the Validation panel to quickly identify any remaining placement or flow errors." | ✅ Action-oriented                                                            |

**Issues**:

- [ ] Title: Expand to "Validate Your API Architecture" (#5)
- [ ] Instruction: Make action-oriented ("Open the Validation panel to check your architecture.") (#3)

---

## 4. Scenario Review: Event-Driven Data Pipeline

**ID**: `scenario-event-pipeline`
**Difficulty**: Advanced
**Steps**: 5

### Step 1: Add Event Sources

| Field       | Content                                                                                   | Criteria Check                                                                                                                                                       |
| ----------- | ----------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Title       | "Add Event Sources"                                                                       | ✅ Action-oriented (#5)                                                                                                                                              |
| Instruction | "Place an Azure Event Grid and an Azure Service Bus on the Region container."             | ✅ Clear action with specific targets                                                                                                                                |
| Hint 1      | "Events and Queues are serverless resources that live on the Region container."           | ⚠️ "Region container" — while technically correct, beginners reaching this advanced scenario may not recall this term. Could add "(the top-level network boundary)". |
| Hint 2      | "Events trigger functions when something happens. Queues buffer messages for processing." | ✅ Clear distinction between events and queues                                                                                                                       |

**Issues**:

- [ ] Hint 1: Add clarification for "Region container" (#2)

### Step 2: Add Processing Functions

| Field       | Content                                                                                                             | Criteria Check                     |
| ----------- | ------------------------------------------------------------------------------------------------------------------- | ---------------------------------- |
| Title       | "Add Processing Functions"                                                                                          | ✅ Action-oriented (#5)            |
| Instruction | "Place two Azure Functions blocks on the Region container - one for event processing and one for batch processing." | ✅ Clear, explains purpose of each |
| Hint 1      | "You need at least two functions: one triggered by events and one for batch processing."                            | ✅ Reinforces the concept          |
| Hint 2      | "Functions run on the Region container, not in subnets."                                                            | ✅ Important placement rule        |

**Issues**: None.

### Step 3: Add an Event Trigger and Storage

| Field       | Content                                                                                                  | Criteria Check                                |
| ----------- | -------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| Title       | "Add an Event Trigger and Storage"                                                                       | ✅ Action-oriented (#5)                       |
| Instruction | "Place an Azure Event Grid trigger on the Region container and an Azure Blob Storage block on a Subnet." | ✅ Two actions, appropriate for advanced (#7) |
| Hint 1      | "Event triggers can drive scheduled or asynchronous processing workflows."                               | ✅ Explains concept                           |
| Hint 2      | "Storage in a subnet keeps your data secure."                                                            | ✅ Concise reason                             |

**Issues**: None.

### Step 4: Connect the Pipeline

| Field       | Content                                                                                                                                                                            | Criteria Check                                                                                                                         |
| ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Title       | "Connect the Pipeline"                                                                                                                                                             | ✅ Action-oriented (#5)                                                                                                                |
| Instruction | "Wire: Azure Event Grid -> Azure Functions, Azure Service Bus -> Azure Functions, Azure Event Grid (Timer) -> Azure Functions (Batch), and Azure Functions -> Azure Blob Storage." | ⚠️ Four connections in one instruction — complex but appropriate for advanced difficulty (#7). The explicit naming prevents ambiguity. |
| Hint 1      | "Events and Queues trigger Functions for processing."                                                                                                                              | ✅ Clear pattern                                                                                                                       |
| Hint 2      | "Functions process data and write results to Storage."                                                                                                                             | ✅ Clear flow                                                                                                                          |
| Hint 3      | "Each trigger type connects to its designated processing function."                                                                                                                | ✅ Clarifies 1:1 mapping                                                                                                               |

**Issues**: None — complexity is appropriate for advanced difficulty.

### Step 5: Final Validation

| Field       | Content                                                                    | Criteria Check                      |
| ----------- | -------------------------------------------------------------------------- | ----------------------------------- |
| Title       | "Final Validation"                                                         | ✅ Clear (#5)                       |
| Instruction | "Validate your event-driven pipeline architecture."                        | ⚠️ Same non-actionable pattern (#3) |
| Hint 1      | "All serverless blocks must be on the Region container."                   | ✅ Recap of placement rule          |
| Hint 2      | "Ensure at least 2 functions are present for the dual-processing pattern." | ✅ Specific requirement             |

**Issues**:

- [ ] Instruction: Make action-oriented ("Open the Validation panel to check your pipeline architecture.") (#3)

---

## 5. Cross-Scenario Consistency Check

### Terminology Consistency

| Term             | Three-Tier                         | Serverless API                          | Event Pipeline     | Consistent?                                             |
| ---------------- | ---------------------------------- | --------------------------------------- | ------------------ | ------------------------------------------------------- |
| Network boundary | "Network container"                | "network boundaries"                    | "Region container" | ⚠️ Mixed — standardize to "Network container" or "VNet" |
| Compute resource | "Azure VM"                         | "Azure Functions"                       | "Azure Functions"  | ✅ Context-appropriate                                  |
| Gateway          | "Azure Load Balancer" / "Gateways" | "Azure Application Gateway" / "Gateway" | N/A                | ⚠️ Hint uses generic, instruction uses specific         |
| Validation step  | "Validate Your Architecture"       | "Validate"                              | "Final Validation" | ⚠️ Inconsistent titles                                  |

### Progressive Complexity Across Scenarios

| Aspect                | Three-Tier (Beginner) | Serverless API (Intermediate) | Event Pipeline (Advanced)      |
| --------------------- | --------------------- | ----------------------------- | ------------------------------ |
| Max actions per step  | 3 (step 3)            | 3 (step 2)                    | 4 connections (step 4)         |
| Jargon introduced     | VNet, Subnet, NSG     | Serverless, Functions         | Event Grid, Service Bus, Batch |
| Prerequisite concepts | None                  | Network zones                 | Events vs Queues, Functions    |

✅ Progression is appropriate — each scenario assumes familiarity with concepts from easier ones.

---

## 6. Summary of Issues Found

### Must Fix (Blocks Acceptance)

| Scenario   | Step           | Issue                           | Criterion                 |
| ---------- | -------------- | ------------------------------- | ------------------------- |
| Three-Tier | Step 2, Hint 2 | "NSG" unexpanded                | #2 Jargon                 |
| Three-Tier | Step 5, Hint 2 | "valid plates" — undefined term | #2 Jargon, #6 Terminology |

### Should Fix (Improves Quality)

| Scenario       | Step                   | Issue                                                                         | Criterion          |
| -------------- | ---------------------- | ----------------------------------------------------------------------------- | ------------------ |
| Three-Tier     | Step 3, Hint 1         | "Gateways" vs "Azure Load Balancer" mismatch                                  | #6 Terminology     |
| Three-Tier     | Step 3, Hint 2         | "NSG rules" unexpanded                                                        | #2 Jargon          |
| Three-Tier     | Step 4, Hint 2         | Generic vs Azure-specific name mismatch                                       | #6 Terminology     |
| Three-Tier     | Step 5, Instruction    | Non-actionable ("Ensure...")                                                  | #3 Filler          |
| Serverless API | Step 4, Title          | Bare "Validate"                                                               | #5 Action-oriented |
| Serverless API | Step 4, Instruction    | Non-actionable                                                                | #3 Filler          |
| Event Pipeline | Step 1, Hint 1         | "Region container" needs clarification                                        | #2 Jargon          |
| Event Pipeline | Step 5, Instruction    | Non-actionable                                                                | #3 Filler          |
| Cross-scenario | Validation step titles | Inconsistent ("Validate Your Architecture" / "Validate" / "Final Validation") | #6 Terminology     |

### Follow-Up Issues Needed

1. **fix(learning): expand NSG acronym in Three-Tier scenario hints** — Steps 2 and 3
2. **fix(learning): replace "valid plates" with "correct containers" in Three-Tier step 5** — Hint 2
3. **fix(learning): standardize validation step titles and instructions across all scenarios** — All three scenarios
4. **fix(learning): align generic vs Azure-specific terms in hints** — Three-Tier steps 3 and 4
5. **fix(learning): add "Region container" clarification in Event Pipeline step 1** — Hint 1

---

## 7. Acceptance Criteria Status

- [x] All 3 scenarios reviewed against 7 criteria
- [x] Language issues documented with specific locations
- [x] 2 must-fix and 9 should-fix issues identified
- [x] 5 follow-up issues recommended for content fixes
