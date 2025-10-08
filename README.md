<!-- prettier-ignore -->
# APICorreios

Uma aplicação de exemplo (frontend estilizado + backend) para consulta de CEP (ViaCEP) e cálculo de frete com integração preparada para os Correios (CalcPrecoPrazo SOAP) — com fallback mock quando o serviço externo não estiver disponível.

Principais características
- Consulta de CEP via backend (`/api/cep/:cep`) — proxy para ViaCEP.
- Cálculo de frete integrado com a API dos Correios (`/api/correios`) + fallback mock por serviço (PAC / SEDEX).
- Frontend moderno com modo escuro, animações suaves, exportação CSV, seleção de serviços e destaque automático do frete mais barato.
- Exemplos de infraestrutura (Bicep) e pipeline GitHub Actions para CI/CD.

Visual rápido
- Abra http://localhost:3000 depois de iniciar o servidor.

Instalação (desenvolvimento)

1. Instale dependências

```bash
npm install
```

2. Rode em modo desenvolvimento (recarrega automaticamente)

```bash
npm run dev
```

3. Abra o app

http://localhost:3000

Uso
- `/api/cep/:cep` — GET: exemplo `GET /api/cep/01001000` retorna JSON do ViaCEP.
- `/api/correios` — POST: corpo JSON com campos como `cepOrigem`, `cepDestino`, `pesoKg`, `comprimentoCM`, `alturaCM`, `larguraCM`, `valorDeclarado` e `servicos` (array de códigos). O endpoint tenta consultar o SOAP dos Correios e, em caso de erro/timeout, retorna `{ fallback: true, results: [...] }` com um resultado por serviço.

Exemplo de payload para `/api/correios`:

```json
{
  "cepOrigem": "01001000",
  "cepDestino": "20010010",
  "pesoKg": 1,
  "comprimentoCM": 20,
  "alturaCM": 10,
  "larguraCM": 15,
  "valorDeclarado": 0,
  "servicos": ["04510","04014"]
}
```

Variáveis de ambiente úteis
- `PORT` — porta do servidor (default 3000).
- `DEBUG=1` — ativa logs verbosos.

Credenciais Correios (opcional)
- O projeto está preparado para enviar `nCdEmpresa` e `sDsSenha` ao chamar o SOAP dos Correios. Nunca comite essas credenciais.
- Em produção, use Azure Key Vault ou variáveis de ambiente seguras para armazenar `nCdEmpresa` / `sDsSenha`.

Deploy (Azure)
- Exemplos em `infra/main.bicep` para criar App Service + Storage Account.
- O workflow de exemplo em `.github/workflows/ci-cd.yml` demonstra pipelines de teste e deploy via Azure CLI (requer segredos configurados no repositório).

CI / GitHub Actions
- O repositório contém um workflow que roda `npm test` e, com segredos configurados, faz deploy por Bicep + zip deploy.

Contribuição
- Issues e pull requests são bem-vindos.
- Antes de abrir PRs, rode os testes: `npm test`.

Publicar neste repositório remoto (exemplo)

```bash
# configure o remote (substitua pelo seu repositório)
git remote add origin https://github.com/GabrielLima-BD/API-Correios.git
git branch -M main
git add -A
git commit -m "chore: README e ajustes para push"
git push -u origin main
```

Se o push falhar por autenticação, use um Personal Access Token (PAT) ou o GitHub CLI (`gh auth login`) para autenticar.

Segurança e notas finais
- Nunca commite segredos. Use Key Vault, Azure App Configuration ou variáveis de ambiente seguras.
- Para produção, habilite monitoramento e tente implementar retries/exponential backoff nas chamadas SOAP.

Licença
- MIT
