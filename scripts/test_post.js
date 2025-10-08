const axios = require('axios');
(async () => {
  try {
    const payload = {
      cepOrigem: '01001000',
      cepDestino: '20010010',
      pesoKg: 1,
      comprimentoCM: 20,
      alturaCM: 10,
      larguraCM: 15,
      valorDeclarado: 0,
      servicos: ['04510','04014']
    };
    const res = await axios.post('http://localhost:3000/api/correios', payload, { timeout: 15000 });
    console.log(JSON.stringify(res.data, null, 2));
  } catch (err) {
    if (err.response) console.error('HTTP', err.response.status, err.response.data);
    else console.error('ERR', err.message);
    process.exit(1);
  }
})();
