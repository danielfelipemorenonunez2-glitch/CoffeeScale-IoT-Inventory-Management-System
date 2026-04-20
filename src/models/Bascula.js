const fs   = require('fs');
const path = require('path');
const LOCAL = path.join(__dirname, '../../data/basculas.json');

function ensure() {
  if (!fs.existsSync(LOCAL)) {
    fs.mkdirSync(path.dirname(LOCAL), { recursive: true });
    fs.writeFileSync(LOCAL, '[]');
  }
}
function read()    { ensure(); return JSON.parse(fs.readFileSync(LOCAL, 'utf-8')); }
function write(d)  { ensure(); fs.writeFileSync(LOCAL, JSON.stringify(d, null, 2)); }
function useMock() {
  const url = process.env.MOCKAPI_BASE_URL;
  return !!(url && url.startsWith('https://') && url.includes('mockapi.io') && !url.includes('TU_ID'));
}

const Bascula = {

  async getAll() {
    console.log('[Bascula.getAll] useMock:', useMock(), '| URL:', process.env.MOCKAPI_BASE_URL);
    if (useMock()) {
      try {
        const mockapi = require('../config/mockapi');
        const data = await mockapi.getBasculas();
        console.log('[Bascula.getAll] MockAPI respondió:', data.length, 'registros');
        return data;
      } catch(e) {
        console.error('[Bascula.getAll] MockAPI ERROR:', e.message);
      }
    }
    return read();
  },

  async upsert(deviceId, tiendaId, pesoGramos, bateria) {
    const registro = {
      deviceId, tiendaId, pesoGramos, bateria,
      ultimaActualizacion: new Date().toISOString()
    };
    console.log('[Bascula.upsert] useMock:', useMock(), '| deviceId:', deviceId);
    if (useMock()) {
      try {
        const mockapi = require('../config/mockapi');
        const lista   = await mockapi.getBasculas();
        const found   = lista.find(b => b.deviceId === deviceId);
        if (found) {
          console.log('[Bascula.upsert] Actualizando en MockAPI id:', found.id);
          return await mockapi.actualizarBascula(found.id, registro);
        } else {
          console.log('[Bascula.upsert] Creando nuevo en MockAPI');
          return await mockapi.crearBascula(registro);
        }
      } catch(e) {
        console.error('[Bascula.upsert] MockAPI ERROR:', e.message);
      }
    }
    const basculas = read();
    const idx = basculas.findIndex(b => b.deviceId === deviceId);
    idx >= 0 ? basculas[idx] = registro : basculas.push(registro);
    write(basculas);
    return registro;
  },

  async findByTienda(tiendaId) {
    return (await this.getAll()).filter(b => b.tiendaId === tiendaId);
  }
};

module.exports = Bascula;
