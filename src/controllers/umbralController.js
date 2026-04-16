const Orden   = require('../models/Orden');
const erpCtrl = require('./erpController');

const colaAlertas = [];
let procesando    = false;

function procesarAlerta(deviceId, tiendaId, pesoActual) {
  colaAlertas.push({ deviceId, tiendaId, pesoActual, enqueuedAt: Date.now() });
  console.log(`[COLA] 📥 ${deviceId} encolado | Cola: ${colaAlertas.length}`);
  if (!procesando) iniciarThrottling();
}

function iniciarThrottling() {
  procesando = true;
  const iv = setInterval(async () => {
    if (!colaAlertas.length) {
      clearInterval(iv); procesando = false;
      console.log('[COLA] ✅ Vacía. Throttling detenido.'); return;
    }
    const alerta = colaAlertas.shift();
    console.log(`[THROTTLING] ⚡ ${alerta.tiendaId} | ${colaAlertas.length} restantes`);
    const orden = await Orden.crear(alerta.deviceId, alerta.tiendaId, alerta.pesoActual);
    await erpCtrl.enviarOrden(orden);
  }, 1000); // 1 req/s → ESC-04
}

function getTamanoCola() { return colaAlertas.length; }

module.exports = { procesarAlerta, getTamanoCola };
