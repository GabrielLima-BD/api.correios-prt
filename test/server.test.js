const axios = require('axios');
const http = require('http');
const app = require('../server/index');

jest.mock('axios');

let server;
beforeAll((done) => {
  server = http.createServer(app);
  server.listen(0, () => {
    const port = server.address().port;
    global.__TEST_SERVER_URL__ = `http://localhost:${port}`;
    done();
  });
});

afterAll((done) => {
  server.close(done);
});

describe('server basic endpoints', () => {
  test('GET /api/health', async () => {
    const res = await fetch(`${global.__TEST_SERVER_URL__}/api/health`);
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body).toHaveProperty('ok', true);
  });

  test('GET /api/cep/:cep - success', async () => {
    const sample = { cep: '01001-000', logradouro: 'Praça da Sé', bairro: 'Sé', localidade: 'São Paulo', uf: 'SP' };
    axios.get.mockResolvedValueOnce({ data: sample });
    const res = await fetch(`${global.__TEST_SERVER_URL__}/api/cep/01001000`);
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body).toHaveProperty('logradouro', 'Praça da Sé');
  });

  test('GET /api/cep/:cep - invalid cep', async () => {
    const res = await fetch(`${global.__TEST_SERVER_URL__}/api/cep/123`);
    expect(res.status).toBe(400);
  });
});
