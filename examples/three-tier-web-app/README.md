# Three-Tier Web App

A classic three-tier cloud architecture pattern using CloudBlocks.

## Architecture Overview

```
Internet → Gateway (Application Gateway)
              ↓
         Public Subnet
              ↓
         Compute (VM / Container App)
              ↓
         Private Subnet
           ↓        ↓
     Database    Storage
     (CUBRID)   (Blob Storage)
```

## Components

| Layer | Block Type | Subnet | Description |
|-------|-----------|--------|-------------|
| Frontend | Gateway | Public | Application Gateway / Load Balancer |
| Application | Compute | Public | VM or Container App instances |
| Data | Database | Private | CUBRID database server |
| Data | Storage | Private | Blob storage for static assets |

## How to Build in CloudBlocks

1. Create a **Network Plate** (VNet)
2. Add a **Public Subnet Plate** inside the Network
3. Add a **Private Subnet Plate** inside the Network
4. Place a **Gateway** block on the Public Subnet
5. Place a **Compute** block on the Public Subnet
6. Place a **Database** block on the Private Subnet
7. Place a **Storage** block on the Private Subnet
8. Connect: Internet → Gateway → Compute → Database
9. Connect: Compute → Storage
10. Run **Validate** to confirm the architecture is valid
