const path = require('path');
const express = require('express');
const axios = require('axios');
const soap = require('soap');

const DEBUG = process.env.DEBUG === '1' || process.env.NODE_ENV === 'development';
function log(...args){ if(DEBUG) console.log(new Date().toISOString(), ...args); }

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// simple request logger (verbose when DEBUG)
app.use((req, res, next) => {
  log('REQ', req.method, req.url, 'from', req.ip);
  res.on('finish', () => log('RES', req.method, req.url, '->', res.statusCode, `(${Date.now()-req._start}ms)`));
  req._start = Date.now();
  next();
});

// Serve frontend
app.use(express.static(path.join(__dirname, '..', 'web')));

// Proxy para ViaCEP
app.get('/api/cep/:cep', async (req, res) => {
  try {
    const cep = req.params.cep.replace(/\D/g, '');
    if (!cep || cep.length !== 8) return res.status(400).json({ error: 'CEP inválido' });
    const viaCepUrl = `https://viacep.com.br/ws/${cep}/json/`;
    log('Calling ViaCEP', viaCepUrl);
    const response = await axios.get(viaCepUrl, { timeout: 5000 });
    if (response.data && response.data.erro) {
      log('ViaCEP not found', cep);
      return res.status(404).json({ error: 'CEP não encontrado' });
    }
    res.json(response.data);
  } catch (err) {
    log('ViaCEP error', err && err.message ? err.message : err);
    res.status(500).json({ error: 'Erro ao consultar CEP', detail: err && err.message ? err.message : String(err) });
  }
});

// Endpoint de frete - mock com estrutura para integrar Correios
app.post('/api/frete', (req, res) => {
  // contrato simples: { cepOrigem, cepDestino, pesoKg, comprimentoCM, alturaCM, larguraCM, valorDeclarado }
  const body = req.body || {};
  const {
    cepOrigem = '',
    cepDestino = '',
    pesoKg = 0.5,
    comprimentoCM = 20,
    alturaCM = 5,
    larguraCM = 15,
    valorDeclarado = 0
  } = body;

  // validações básicas
  if (!cepOrigem || !cepDestino) return res.status(400).json({ error: 'cepOrigem e cepDestino são obrigatórios' });

  // cálculo mock: base + distância aproximada por diferença de DDDs/UFs
  // Em produção, integrar com API dos Correios (SIGEP/Webservice) ou usar biblioteca.
  let base = 12.5; // R$
  const pesoFactor = Math.max(0.5, pesoKg) * 2; // R$ por kg
  const volume = (comprimentoCM * alturaCM * larguraCM) / 1000; // simplificado
  const volumeFactor = Math.max(1, volume / 5);

  // aproximação por uf
  const ufCoef = (cepOrigem.slice(0, 2) === cepDestino.slice(0, 2)) ? 0.9 : 1.6;

  const price = Number(((base + pesoFactor * volumeFactor) * ufCoef + valorDeclarado * 0.01).toFixed(2));

  res.json({ service: 'PAC (mock)', prazoDias: Math.ceil(3 * ufCoef), valor: price });
});

// health endpoint
app.get('/api/health', (req, res) => {
  res.json({ ok: true, pid: process.pid, uptimeSec: Math.floor(process.uptime()) });
});

// helper: create soap client with timeout
function createClientWithTimeout(wsdl, timeoutMs = 10000){
  return Promise.race([
    soap.createClientAsync(wsdl),
    new Promise((_, rej) => setTimeout(() => rej(new Error('SOAP client timeout')), timeoutMs))
  ]);
}

// Integração com Correios (CalcPrecoPrazo SOAP)
// Exemplo de uso: POST /api/correios { cepOrigem, cepDestino, pesoKg, comprimentoCM, alturaCM, larguraCM, valorDeclarado, servicos: ['04510','04162'] }
app.post('/api/correios', async (req, res) => {
  try {
    const body = req.body || {};
    const {
      cepOrigem = '',
      cepDestino = '',
      pesoKg = 0.5,
      comprimentoCM = 20,
      alturaCM = 5,
      larguraCM = 15,
      valorDeclarado = 0,
      servicos = ['04510','04014'] // SEDEX 04510 e PAC 04014 - códigos comuns
    } = body;

    if (!cepOrigem || !cepDestino) return res.status(400).json({ error: 'cepOrigem e cepDestino são obrigatórios' });

    // Correios espera valores em string e medidas específicas
    const wsdl = 'https://ws.correios.com.br/calculador/CalcPrecoPrazo.asmx?WSDL';
    log('Creating SOAP client for Correios');
    const client = await createClientWithTimeout(wsdl, 10000);

    if(!client){
      throw new Error('Não foi possível criar cliente SOAP dos Correios');
    }

    // Monta múltiplos pedidos para cada serviço
    const promises = servicos.map(async (codigo) => {
      const params = {
        nCdEmpresa: '',
        sDsSenha: '',
        nCdServico: codigo,
        sCepOrigem: cepOrigem.replace(/\D/g, ''),
        sCepDestino: cepDestino.replace(/\D/g, ''),
        nVlPeso: String(pesoKg),
        nCdFormato: '1', // caixa/pacote
        nVlComprimento: String(Math.max(16, comprimentoCM)),
        nVlAltura: String(Math.max(2, alturaCM)),
        nVlLargura: String(Math.max(11, larguraCM)),
        nVlDiametro: '0',
        sCdMaoPropria: 'N',
        nVlValorDeclarado: String(valorDeclarado || 0),
        sCdAvisoRecebimento: 'N'
      };

  log('Calling CalcPrecoPrazo for service', codigo, { params });
  const [result] = await client.CalcPrecoPrazoAsync(params);
  log('CalcPrecoPrazo result for', codigo, result && result.CalcPrecoPrazoResult ? 'ok' : 'no-result');
      // result.CalcPrecoPrazoResult.Servicos.cServico pode ser objeto ou array
      const serv = result && result.CalcPrecoPrazoResult && result.CalcPrecoPrazoResult.Servicos && result.CalcPrecoPrazoResult.Servicos.cServico;
      if (!serv) return { codigo, error: 'Sem resposta' };

      // quando é array ou objeto
      const info = Array.isArray(serv) ? serv[0] : serv;
      return {
        codigo: info.Codigo || codigo,
        valor: info.Valor ? info.Valor.replace(',', '.') : null,
        prazo: info.PrazoEntrega || null,
        erro: info.Erro || null,
        msgErro: info.MsgErro || null
      };
    });

    const results = await Promise.all(promises);
    res.json({ results });
  } catch (err) {
    log('Correios SOAP error', err && err.message ? err.message : err);

    // fallback automático para o mock, a menos que o cliente peça explicitamente sem fallback
    if (req.body && req.body.fallback === false) {
      return res.status(500).json({ error: 'Erro ao consultar Correios', detail: err && err.message ? err.message : String(err) });
    }

    log('Using fallback mock calculation');
    // replica do cálculo mock (gerar resultado por serviço solicitado)
    const body = req.body || {};
    const {
      cepOrigem = '',
      cepDestino = '',
      pesoKg = 0.5,
      comprimentoCM = 20,
      alturaCM = 5,
      larguraCM = 15,
      valorDeclarado = 0,
      servicos = ['04014']
    } = body;

    // componentes básicos
    const base = 10.0;
    const pesoFactor = Math.max(0.5, pesoKg) * 2;
    const volume = (comprimentoCM * alturaCM * larguraCM) / 1000;
    const volumeFactor = Math.max(1, volume / 5);
    const ufCoef = (cepOrigem.slice(0, 2) === cepDestino.slice(0, 2)) ? 0.9 : 1.6;

    // coeficientes por serviço (SEDEX geralmente mais caro que PAC)
    const svcCoef = (code) => {
      if (['04510','04162','40010','40096'].includes(code)) return 2.3; // sedex-like
      if (['04014','41068','41106'].includes(code)) return 1.0; // pac-like
      return 1.2; // default
    };

    const svcName = (code) => {
      if (['04510','04162','40010','40096'].includes(code)) return 'SEDEX (mock)';
      if (['04014','41068','41106'].includes(code)) return 'PAC (mock)';
      return `Serviço ${code} (mock)`;
    };

    const results = servicos.map(code => {
      const coef = svcCoef(code);
      const price = Number(((base + pesoFactor * volumeFactor) * coef * ufCoef + valorDeclarado * 0.01).toFixed(2));
      const prazo = Math.ceil((coef === 1.0 ? 3 : 2) * ufCoef);
      return { codigo: code, service: svcName(code), valor: price, prazo: prazo };
    });

    res.status(200).json({ fallback: true, results, errorDetail: err && err.message ? err.message : String(err) });
  }
});

// fallback para SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'web', 'index.html'));
});

if (require.main === module) {
  app.listen(PORT, () => console.log(`Server rodando em http://localhost:${PORT}`));
}

module.exports = app;
