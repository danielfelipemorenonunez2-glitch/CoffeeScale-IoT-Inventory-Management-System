const fs   = require('fs');
const path = require('path');
const LOCAL = path.join(__dirname, '../../data/basculas.json');

function ensure() {
  if (!fs.existsSync(LOCAL)) {
    fs.mkdirSync(path.dirname(LOCAL), { recursive: true });
    fs.writeFileSync(LOCAL, '[]');
  }
}
function read()      { ensure(); return JSON.parse(fs.readFileSync(LOCAL, 'utf-8')); }
function write(data) { ensure(); fs.writeFileSync(LOCAL, JSON.stringify(data, null, 2)); }

function useMock() {
  return process.env.MOCKAPI_BASE_URL && !process.env.MOCKAPI_BASE_URL.includes('TU_ID');
}

const Bascula = {
  async getAll() {
    if (useMock()) {
      try { return await require('../config/mockapi').getBasculas(); } catch {}
    }
    return read();
  },

  async upsert(deviceId, tiendaId, pesoGramos, bateria) {
    const registro = { deviceId, tiendaId, pesoGramos, bateria, ultimaActualizacion: new Date().toISOString() };
    if (useMock()) {
      try {
        const mockapi = require('../config/mockapi');
        const lista   = await mockapi.getBasculas();
        const found   = lista.find(b => b.deviceId === deviceId);
        return found ? await mockapi.actualizarBascula(found.id, registro)
                     : await mockapi.crearBascula(registro);
      } catch {}
    }
    const basculas = read();
    const idx      = basculas.findIndex(b => b.deviceId === deviceId);
    idx >= 0 ? basculas[idx] = registro : basculas.push(registro);
    write(basculas);
    return registro;
  },

  async findByTienda(tiendaId) {
    return (await this.getAll()).filter(b => b.tiendaId === tiendaId);
  }
};

module.exports = Bascula;
