# Provider Support

> **Audience**: Beginners | **Status**: V1 Core | **Reviewed against**: source on 2026-09-25 (app v0.53.0)

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

This table covers all 28 creation-palette resources. For Azure, Terraform export resolves the canonical model `resourceType`; an exact implementation emits the listed starter resource and an unsupported resource blocks export instead of silently selecting another service. AWS and GCP still use subtype/category adapters, where **Fallback** can represent a different service from the palette label. No entry promises deployability, Azure plan success, or complete networking semantics.

| Palette group | Resource | Azure | AWS | GCP |
| :-- | :-- | :-- | :-- | :-- |
| Network | Network | Container `azurerm_virtual_network` | Container `aws_vpc` | Container `google_compute_network` |
| Network | Subnet | Container `azurerm_subnet` | Container `aws_subnet` | Container `google_compute_subnetwork` |
| Network | NAT Gateway | Unsupported | Fallback `aws_vpc` | Fallback `google_compute_network` |
| Network | Public IP | Unsupported | Fallback `aws_vpc` | Fallback `google_compute_network` |
| Network | Route Table | Unsupported | Fallback `aws_vpc` | Fallback `google_compute_network` |
| Network | Private Endpoint | Unsupported | Fallback `aws_vpc` | Fallback `google_compute_network` |
| Delivery | DNS | Unsupported | Fallback `aws_lb` | Fallback `google_compute_backend_service` |
| Delivery | CDN | Unsupported | Fallback `aws_lb` | Fallback `google_compute_backend_service` |
| Delivery | Front Door | Unsupported | Fallback `aws_lb` | Fallback `google_compute_backend_service` |
| Delivery | Internal LB | Unsupported | Fallback `aws_lb` | Specific `google_compute_url_map` |
| Delivery | Application Gateway | Specific `azurerm_application_gateway` | Specific `aws_lb` | Specific `google_compute_url_map` |
| Compute | Functions | Specific `azurerm_linux_function_app` | Specific `aws_lambda_function` | Specific `google_cloudfunctions2_function` |
| Compute | App Service | Specific `azurerm_linux_web_app` | Fallback `aws_instance` | Fallback `google_cloud_run_v2_service` |
| Compute | Container Instances | Unsupported | Specific `aws_ecs_service` | Specific `google_cloud_run_v2_service` |
| Compute | VM | Specific `azurerm_linux_virtual_machine` | Specific `aws_instance` | Specific `google_compute_instance` |
| Compute | Kubernetes | Unsupported | Fallback `aws_instance` | Fallback `google_cloud_run_v2_service` |
| Data | Storage | Specific `azurerm_storage_account` | Specific `aws_s3_bucket` | Specific `google_storage_bucket` |
| Data | SQL Database | Specific `azurerm_mssql_database` | Specific `aws_db_instance` | Specific `google_sql_database_instance` |
| Data | Cosmos DB | Specific `azurerm_cosmosdb_account` | Specific `aws_dynamodb_table` | Specific `google_firestore_database` |
| Data | Redis Cache | Unsupported | Fallback `aws_db_instance` | Fallback `google_sql_database_instance` |
| Messaging | Queue | Specific `azurerm_servicebus_namespace` | Specific `aws_sqs_queue` | Specific `google_pubsub_topic` |
| Messaging | Event Hubs | Unsupported | Specific `aws_cloudwatch_event_bus` | Specific `google_eventarc_trigger` |
| Security | Key Vault | Unsupported | Fallback `aws_iam_role` | Fallback `google_compute_security_policy` |
| Security | Firewall | Unsupported | Fallback `aws_iam_role` | Specific `google_compute_security_policy` |
| Security | Network Security Group | Specific `azurerm_network_security_group` | Fallback `aws_iam_role` | Specific `google_compute_security_policy` |
| Security | Bastion | Unsupported | Fallback `aws_iam_role` | Fallback `google_compute_security_policy` |
| Identity | Managed Identity | Specific `azurerm_user_assigned_identity` | Fallback `aws_iam_role` | Specific `google_project_iam_member` |
| Operations | Monitor | Specific `azurerm_monitor_workspace` | Specific `aws_cloudwatch_dashboard` | Specific `google_monitoring_dashboard` |

**Important limitations:** Azure now blocks unsupported canonical resources rather than emitting a category-default service. Service Bus emits a namespace starter, but queues/topics and application wiring remain manual. Private Endpoint remains unsupported until the model captures its subnet, target resource, and service-specific connection group. GCP Cloud Tasks still maps to Pub/Sub, and GCP Managed Identity uses an IAM member placeholder. SQL Database needs a server, and Application Gateway needs a dedicated subnet and additional frontend/backend wiring. Generic HTTP/DATA connections are not Private Endpoints or VNet Integration. **Never apply generated code without review.** The palette's `starter`/`advanced` tiers describe learning complexity, not Terraform maturity.

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
