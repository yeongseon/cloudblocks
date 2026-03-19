terraform {
  required_version = ">= 1.5.0"

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.100"
    }
  }

  # Uncomment and configure for remote state:
  # backend "azurerm" {
  #   resource_group_name  = "rg-cloudblocks-tfstate"
  #   storage_account_name = "cloudblockstfstate"
  #   container_name       = "tfstate"
  #   key                  = "production.terraform.tfstate"
  # }
}

provider "azurerm" {
  features {}
}
