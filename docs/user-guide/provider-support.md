# Provider Support

> **Audience**: Beginners | **Status**: V1 Core | **Reviewed against**: source on 2026-09-24 (app v0.53.0)

CloudBlocks uses an **Azure-first design**: all built-in templates and learning scenarios use Azure resources. AWS and GCP support is provided through a **provider mapping layer** that translates Azure resource types to their cloud-equivalent counterparts. All three providers are available in the visual builder and Terraform starter export.

For details on provider coverage by resource category, see the table below.

---

## Provider Coverage Summary

| Feature                    | Azure            | AWS                        | GCP                        |
| :------------------------- | :--------------- | :------------------------- | :------------------------- |
| **Visual builder**         | ✅ Active         | ✅ Active                    | ✅ Active                    |
| **Templates & scenarios**  | ✅ Azure content  | — None yet                 | — None yet                 |
| **Validation engine**      | ✅ Full           | ✅ Full                      | ✅ Full                      |
| **Terraform starter code** | ⚠️ Partial       | ⚠️ Partial                  | ⚠️ Partial                  |
| **Bicep export**           | ✅ Azure-only     | — (Azure-only by design)   | — (Azure-only by design)   |
| **Pulumi export**          | ✅ Azure-only     | — (Planned for V2)         | — (Planned for V2)         |

AWS and GCP Terraform output includes `# TODO` comments for resource properties that the visual model does not capture. Review and fill in these fields before applying the generated code.

### Resource-by-resource Terraform mapping

This table covers all 28 creation-palette resources. ✅ **Mapped** means a container or explicit subtype mapping emits starter Terraform; 🔧 **Starter/fallback** means the adapter instead uses a generic *category* mapping, so the emitted resource may represent a different service than the palette label. Neither marker promises deployable code. The cells show the Terraform resource type selected for a palette block or container after template subtype remapping. Blank or custom subtypes can resolve differently. A dash would mean no mapping at all; this palette currently uses category fallbacks instead. This is a starter-code inventory, **not** a claim of service equivalence, validated deployment, or complete networking semantics.

| Palette group | Resource | Azure | AWS | GCP |
| :-- | :-- | :-- | :-- | :-- |
| Network | Network | Container `azurerm_virtual_network` | Container `aws_vpc` | Container `google_compute_network` |
| Network | Subnet | Container `azurerm_subnet` | Container `aws_subnet` | Container `google_compute_subnetwork` |
| Network | NAT Gateway | Specific `azurerm_nat_gateway` | Fallback `aws_vpc` | Fallback `google_compute_network` |
| Network | Public IP | Specific `azurerm_public_ip` | Fallback `aws_vpc` | Fallback `google_compute_network` |
| Network | Route Table | Specific `azurerm_route_table` | Fallback `aws_vpc` | Fallback `google_compute_network` |
| Network | Private Endpoint | Specific `azurerm_private_endpoint` | Fallback `aws_vpc` | Fallback `google_compute_network` |
| Delivery | DNS | Fallback `azurerm_application_gateway` | Fallback `aws_lb` | Fallback `google_compute_backend_service` |
| Delivery | CDN | Fallback `azurerm_application_gateway` | Fallback `aws_lb` | Fallback `google_compute_backend_service` |
| Delivery | Front Door | Fallback `azurerm_application_gateway` | Fallback `aws_lb` | Fallback `google_compute_backend_service` |
| Delivery | Internal LB | Fallback `azurerm_application_gateway` | Fallback `aws_lb` | Specific `google_compute_url_map` |
| Delivery | Application Gateway | Specific `azurerm_application_gateway` | Specific `aws_lb` | Specific `google_compute_url_map` |
| Compute | Functions | Specific `azurerm_linux_function_app` | Specific `aws_lambda_function` | Specific `google_cloudfunctions2_function` |
| Compute | App Service | Specific `azurerm_linux_web_app` | Fallback `aws_instance` | Fallback `google_cloud_run_v2_service` |
| Compute | Container Instances | Specific `azurerm_container_group` | Specific `aws_ecs_service` | Specific `google_cloud_run_v2_service` |
| Compute | VM | Specific `azurerm_linux_virtual_machine` | Specific `aws_instance` | Specific `google_compute_instance` |
| Compute | Kubernetes | Specific `azurerm_kubernetes_cluster` | Fallback `aws_instance` | Fallback `google_cloud_run_v2_service` |
| Data | Storage | Specific `azurerm_storage_account` | Specific `aws_s3_bucket` | Specific `google_storage_bucket` |
| Data | SQL Database | Specific `azurerm_mssql_database` | Specific `aws_db_instance` | Specific `google_sql_database_instance` |
| Data | Cosmos DB | Specific `azurerm_cosmosdb_account` | Specific `aws_dynamodb_table` | Specific `google_firestore_database` |
| Data | Redis Cache | Fallback `azurerm_postgresql_flexible_server` | Fallback `aws_db_instance` | Fallback `google_sql_database_instance` |
| Messaging | Queue | Specific `azurerm_storage_queue` | Specific `aws_sqs_queue` | Specific `google_pubsub_topic` |
| Messaging | Event Hubs | Fallback `azurerm_storage_queue` | Specific `aws_cloudwatch_event_bus` | Specific `google_eventarc_trigger` |
| Security | Key Vault | Fallback `azurerm_user_assigned_identity` | Fallback `aws_iam_role` | Fallback `google_compute_security_policy` |
| Security | Firewall | Fallback `azurerm_user_assigned_identity` | Fallback `aws_iam_role` | Specific `google_compute_security_policy` |
| Security | Network Security Group | Specific `azurerm_network_security_group` | Fallback `aws_iam_role` | Specific `google_compute_security_policy` |
| Security | Bastion | Fallback `azurerm_user_assigned_identity` | Fallback `aws_iam_role` | Fallback `google_compute_security_policy` |
| Identity | Managed Identity | Specific `azurerm_user_assigned_identity` | Fallback `aws_iam_role` | Specific `google_project_iam_member` |
| Operations | Monitor | Fallback `azurerm_log_analytics_workspace` | Specific `aws_cloudwatch_dashboard` | Specific `google_monitoring_dashboard` |

**Important limitations:** The Azure queue palette label says Service Bus but its subtype emits a storage queue; the GCP label says Cloud Tasks but emits Pub/Sub. Azure Event Hubs has no dedicated Terraform mapping and therefore selects a storage queue through the generic messaging fallback; that is **not** Event Hubs support. GCP Managed Identity selects an IAM member with a placeholder principal, not a service account. SQL Database needs a server, and Application Gateway needs a dedicated subnet and additional frontend/backend wiring. Generic HTTP/DATA connections are not Private Endpoints or VNet Integration. Several explicit mappings emit only partial configuration or `# TODO` comments, so **never apply generated code without review**. The palette's `starter`/`advanced` visibility tiers describe learning complexity, not the maturity of Terraform output. See the [palette definitions](https://github.com/yeongseon/cloudblocks/blob/main/apps/web/src/shared/hooks/useTechTree.ts), [template subtype remapping](https://github.com/yeongseon/cloudblocks/blob/main/apps/web/src/shared/utils/providerMapping.ts), [mapping fallback rule](https://github.com/yeongseon/cloudblocks/blob/main/apps/web/src/features/generate/types.ts), and [provider adapters](https://github.com/yeongseon/cloudblocks/tree/main/apps/web/src/features/generate/providers) for verification when resources change.

---

## Provider Selector (Current State)

The menu bar shows three provider tabs: **Azure**, **AWS**, and **GCP**. Clicking a different provider tab creates a new provider-specific workspace after a confirmation dialog — your current workspace is preserved.

- Each provider workspace starts from a blank canvas (or from a template if you load one).
- Switching providers creates a separate workspace — it does not change your existing architecture in place.
- Previously generated code is cleared when you switch providers to avoid stale output.
- Each provider remembers your last entered region during the session.

---

## Multi-Cloud Terraform Generation

CloudBlocks supports multi-cloud Terraform generation — each provider workspace generates provider-specific Terraform starter code for Azure, AWS, or GCP.

!!! info "Learning focus"
    Multi-cloud support is a learning feature — it shows you the provider-specific resources and structure for the same architecture pattern. CloudBlocks does not deploy infrastructure or manage Terraform state.

---

## Export Format by Provider

| Export Format   | Providers Supported               | Status       |
| :-------------- | :-------------------------------- | :----------- |
| **Terraform**   | Azure ✅, AWS ✅, GCP ✅             | V1 Core      |
| **Bicep**       | Azure only (by design)            | Experimental |
| **Pulumi**      | Azure only (multi-cloud in V2)    | Experimental |

For details on exporting code, see [Code Generation](../advanced/code-generation.md).

---

## What's Next?

| Goal                             | Guide                                            |
| :------------------------------- | :----------------------------------------------- |
| Export Terraform starter code    | [Code Generation](../advanced/code-generation.md) |
| Understand the building blocks   | [Core Concepts](core-concepts.md)                |
| Browse architecture patterns     | [Templates](templates.md)                        |
