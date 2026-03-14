# CUBRID Reference Architecture

A reference architecture demonstrating CUBRID as the primary database in a CloudBlocks deployment.

## Architecture Overview

```
Internet → Gateway (App Gateway)
              ↓
         Public Subnet
              ↓
         Compute (App Server)
              ↓
         Private Subnet
           ↓        ↓
     Database    Storage
     (CUBRID)   (Backup / Blob)
```

## Why CUBRID?

CloudBlocks uses CUBRID as its primary database for several reasons:

- **Open Source**: Fully open-source relational database
- **SQL Standard**: ANSI SQL compliance with extensions
- **High Availability**: Built-in HA with automatic failover
- **CLOB Support**: Large text fields for JSON data storage
- **Lightweight**: Efficient resource usage for development and production

## CUBRID-Specific Features in CloudBlocks

| Feature | Implementation |
|---------|---------------|
| UUID storage | `VARCHAR(36)` — no native UUID type |
| JSON data | `CLOB` columns with application-layer parsing |
| Timestamps | `DATETIME` with ISO 8601 formatting |
| Custom ORM | Lightweight query builder (not TypeORM/Prisma) |

## How to Build in CloudBlocks

1. Follow the standard three-tier web app pattern
2. The Database block represents a CUBRID instance
3. Connection from Compute → Database represents the CUBRID JDBC/Node connection
4. Storage block can represent CUBRID backup storage or blob storage for artifacts

## Reference

- [CUBRID Official Documentation](https://www.cubrid.org/manual/en/11.0/index.html)
- See `docs/DATABASE_ARCHITECTURE.md` for the full CUBRID schema design
