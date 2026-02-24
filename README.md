# Correios Helper — Consulta CEP & Frete

Correios Helper é um projeto completo para consulta de CEP e simulação de frete premium, com frontend moderno e backend Node.js/Express. O sistema integra a API dos Correios (CalcPrecoPrazo SOAP) e ViaCEP, oferecendo experiência visual de alto padrão, microinterações, histórico detalhado, modo escuro, loader animado, exportação de resultados e infraestrutura pronta para deploy em Azure.

## O que o projeto faz?

- Permite consultar endereços por CEP usando ViaCEP, com resposta rápida e visual refinado.
- Simula frete SEDEX/PAC entre dois CEPs, calculando valores, prazos e destacando automaticamente o frete mais barato.
- Oferece histórico premium de consultas e simulações, permitindo repopular formulários com um clique.
- Exporta resultados de frete para CSV.
- Possui modo escuro, loader animado, ripple effect nos botões, glassmorphism, responsividade e tipografia premium.
- Backend Node.js/Express serve as APIs, faz proxy para ViaCEP e integra com o SOAP dos Correios, usando fallback mock quando o serviço está indisponível.
- Infraestrutura pronta para Azure (Bicep), CI/CD com GitHub Actions, e orientações de segurança.

## Como funciona?

### Frontend
- Interface premium, inspirada em prints de alto padrão.
- Microinterações: loader customizado, ripple effect, animações de fade-in, tooltips, histórico detalhado.
- Modo escuro/claro com alternância instantânea.
- Formulários intuitivos para consulta de CEP e simulação de frete.
- Botões de serviço SEDEX/PAC com seleção exclusiva ou ambos, bloqueio de cálculo sem seleção.
- Histórico salva até 20 consultas/simulações, exibindo tipo, valor, prazo, data/hora e permitindo repopular os campos.
- Exportação de resultados de frete para CSV.

### Backend
- API Express para `/api/cep/:cep` (proxy ViaCEP) e `/api/correios` (integração Correios SOAP).
- Fallback mock para simulação de frete caso o serviço dos Correios esteja indisponível.
- Preparado para receber credenciais dos Correios via variáveis de ambiente.
- Logs verbosos com `DEBUG=1`.

### Infraestrutura
- Arquivos Bicep para deploy em Azure App Service e Storage Account.
- Pipeline CI/CD com GitHub Actions, rodando testes e deploy automatizado.

## Instalação e uso

1. Instale dependências:

```bash
npm install
```

2. Rode em modo desenvolvimento (com recarregamento automático):

```bash
npm run dev
```

3. Acesse o app:

http://localhost:3000

## Endpoints

- `/api/cep/:cep` — GET: exemplo `GET /api/cep/01001000` retorna JSON do ViaCEP.
- `/api/correios` — POST: corpo JSON com campos como `cepOrigem`, `cepDestino`, `pesoKg`, `comprimentoCM`, `alturaCM`, `larguraCM`, `valorDeclarado` e `servicos` (array de códigos). O endpoint tenta consultar o SOAP dos Correios e, em caso de erro/timeout, retorna `{ fallback: true, results: [...] }` com um resultado por serviço.

### Exemplo de payload para `/api/correios`:

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

## Variáveis de ambiente
- `PORT` — porta do servidor (default 3000).
- `DEBUG=1` — ativa logs verbosos.