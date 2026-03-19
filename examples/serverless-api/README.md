# Serverless API

A serverless API architecture pattern using CloudBlocks.

## Architecture Overview

```
Internet → Gateway (API Gateway)
              ↓
         Public Subnet
              ↓
         Compute (Function App / Container)
              ↓
         Private Subnet
           ↓        ↓
     Database    Storage
     (Managed)  (Queue / Blob)
```

## Components

| Layer | Block Type | Subnet | Description |
|-------|-----------|--------|-------------|
| Entry | Gateway | Public | API Gateway / Function proxy |
| Logic | Compute | Public | Serverless functions / Container Apps |
| Data | Database | Private | Managed database for structured data |
| Data | Storage | Private | Queue storage for async processing |

## How to Build in CloudBlocks

1. Create a **Region Plate** (VNet)
2. Add **Public** and **Private Subnet Plates**
3. Place a **Gateway** block on the Public Subnet
4. Place a **Compute** block on the Public Subnet
5. Place **Database** and **Storage** blocks on the Private Subnet
6. Connect: Internet → Gateway → Compute → Database
7. Connect: Compute → Storage
8. Run **Validate** to confirm

## Notes

- In a real serverless architecture, the VNet integration may vary
- This example demonstrates the logical data flow pattern
- Gateway represents the API management layer
