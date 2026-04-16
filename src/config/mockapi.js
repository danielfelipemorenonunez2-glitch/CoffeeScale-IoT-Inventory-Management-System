require('dotenv').config();
const fetch = require('node-fetch');

const BASE = process.env.MOCKAPI_BASE_URL;

async function request(method, endpoint, body = null) {
  const url     = `${BASE}/${endpoint}`;
  const options = {
    method,
    headers: { 'Content-Type': 'application/json' },
    signal:  AbortSignal.timeout(8000)
  };
  if (body) options.body = JSON.stringify(body);
  const res = await fetch(url, options);
  if (!res.ok) throw new Error(`MockAPI ${method} /${endpoint} → ${res.status}`);
  return res.json();
}

const mockapi = {
  async getBasculas()               { return request('GET',  'basculas'); },
  async crearBascula(data)          { return request('POST', 'basculas', data); },
  async actualizarBascula(id, data) { return request('PUT',  `basculas/${id}`, data); },
  async getOrdenes()                { return request('GET',  'ordenes'); },
  async crearOrden(data)            { return request('POST', 'ordenes', data); },
  async actualizarOrden(id, data)   { return request('PUT',  `ordenes/${id}`, data); },
  async getLogs()                   { return request('GET',  'logs'); },
  async crearLog(data)              { return request('POST', 'logs', data); },
};

module.exports = mockapi;
