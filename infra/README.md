Infra para Azure (Bicep)

Arquivos em `infra/` fornecem um exemplo mínimo de implantação usando Bicep.

Passos rápidos:

1. Instale Azure CLI e Bicep:
   - https://learn.microsoft.com/cli/azure/install-azure-cli
   - Bicep já vem com az cli recentes; ou https://learn.microsoft.com/azure/azure-resource-manager/bicep/install

2. Faça login e selecione subscription:
```
az login
az account set --subscription "<your-subscription-id>"
```

3. Crie um resource group e faça deploy:
```
az group create -n my-rg -l brazilsouth
az deployment group create -g my-rg -f infra/main.bicep
```

Notas de segurança:
- Use Managed Identities e Key Vault para segredos (não inclua credenciais no código).
- Ajuste SKUs e regras de firewall conforme necessidade.

Referências:
- https://learn.microsoft.com/azure/app-service/
- https://learn.microsoft.com/azure/azure-resource-manager/bicep/
