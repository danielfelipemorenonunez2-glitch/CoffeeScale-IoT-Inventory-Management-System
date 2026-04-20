const fs   = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const LOCAL = path.join(__dirname, '../../data/ordenes.json');

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

const Orden = {

  async getAll() {
    if (useMock()) {
      try { return await require('../config/mockapi').getOrdenes(); }
      catch(e) { console.error('[Orden.getAll] MockAPI ERROR:', e.message); }
    }
    return read();
  },

  async crear(deviceId, tiendaId, pesoActual) {
    const nueva = {
      ordenId: uuidv4(), deviceId, tiendaId, pesoActual,
      estado: 'PENDIENTE', intentos: 0,
      fechaCreacion: new Date().toISOString()
    };
    if (useMock()) {
      try { return await require('../config/mockapi').crearOrden(nueva); }
      catch(e) { console.error('[Orden.crear] MockAPI ERROR:', e.message); }
    }
    const ordenes = read(); ordenes.push(nueva); write(ordenes);
    return nueva;
  },

  async actualizarEstado(ordenId, estado) {
    if (useMock()) {
      try {
        const mockapi = require('../config/mockapi');
        const lista   = await mockapi.getOrdenes();
        const found   = lista.find(o => o.ordenId === ordenId);
        if (found) return await mockapi.actualizarOrden(found.id, { ...found, estado, intentos: (found.intentos||0)+1 });
      } catch(e) { console.error('[Orden.actualizarEstado] MockAPI ERROR:', e.message); }
    }
    const ordenes = read();
    const idx = ordenes.findIndex(o => o.ordenId === ordenId);
    if (idx >= 0) { ordenes[idx].estado = estado; ordenes[idx].intentos++; write(ordenes); }
  }
};

module.exports = Orden;
