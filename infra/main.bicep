// Infra Bicep mínima para deploy do app Node.js (App Service + Storage)
// NOTAS:
// - Use Managed Identity para acessar recursos (se necessário) e Key Vault para segredos.
// - Ajuste nomes, tamanhos de plano e SKU conforme sua necessidade.

param location string = resourceGroup().location
param siteName string = 'apicorreios-${uniqueString(resourceGroup().id)}'
param storageName string = toLower('stapicorreios${uniqueString(resourceGroup().id)}')

resource storage 'Microsoft.Storage/storageAccounts@2022-09-01' = {
  name: storageName
  location: location
  sku: { name: 'Standard_LRS' }
  kind: 'StorageV2'
  properties: {
    accessTier: 'Hot'
  }
}

resource plan 'Microsoft.Web/serverfarms@2022-03-01' = {
  name: '${siteName}-plan'
  location: location
  sku: {
    name: 'P1v2'
    tier: 'PremiumV2'
  }
  properties: { reserved: false }
}

resource web 'Microsoft.Web/sites@2022-03-01' = {
  name: siteName
  location: location
  kind: 'app'
  properties: {
    serverFarmId: plan.id
  }
}

output siteUrl string = 'https://${web.properties.defaultHostName}'
