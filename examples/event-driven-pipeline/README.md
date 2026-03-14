# Event-Driven Pipeline

An event-driven data processing pipeline using CloudBlocks.

## Architecture Overview

```
Internet → Gateway (Event Ingestion)
              ↓
         Public Subnet
              ↓
         Compute (Stream Processor)
              ↓
         Private Subnet
           ↓        ↓
     Database    Storage
     (Managed)  (Event Store / Blob)
```

## Components

| Layer | Block Type | Subnet | Description |
|-------|-----------|--------|-------------|
| Ingestion | Gateway | Public | Event ingestion endpoint |
| Processing | Compute | Public | Stream processor / event handler |
| Persistence | Database | Private | Managed database for processed results |
| Persistence | Storage | Private | Raw event archive / blob storage |

## How to Build in CloudBlocks

1. Create a **Network Plate** (VNet)
2. Add **Public** and **Private Subnet Plates**
3. Place a **Gateway** block on the Public Subnet (event ingestion)
4. Place a **Compute** block on the Public Subnet (event processor)
5. Place **Database** and **Storage** blocks on the Private Subnet
6. Connect: Internet → Gateway → Compute → Database
7. Connect: Compute → Storage
8. Run **Validate** to confirm

## Pattern Description

This pattern represents a simplified event-driven architecture where:
- Events enter through the Gateway
- Compute processes and transforms events
- Processed data is stored in Database
- Raw events are archived in Storage
