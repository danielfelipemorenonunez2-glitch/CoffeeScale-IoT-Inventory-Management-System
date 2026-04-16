const Orden            = require('../models/Orden');
const notificacionCtrl = require('./notificacionController');
const fetch            = require('node-fetch');

const MAX_INTENTOS = 3;
const COOLDOWN_MS  = 30000;

const cb = {
  estado: 'CERRADO', fallos: 0, ultimoFallo: null,
  fallo()  { this.fallos++; this.ultimoFallo = Date.now(); if (this.fallos >= 3) { this.estado = 'ABIERTO'; console.log('[CB] 🔴 ABIERTO'); } },
  exito()  { this.fallos = 0; this.estado = 'CERRADO'; },
  puede()  {
    if (this.estado === 'CERRADO') return true;
    if (this.estado === 'ABIERTO' && Date.now() - this.ultimoFallo >= COOLDOWN_MS) {
      this.estado = 'SEMIABIERTO'; console.log('[CB] 🟡 SEMIABIERTO'); return true;
    }
    return this.estado !== 'ABIERTO';
  }
};

async function enviarOrden(orden) {
  if (!cb.puede()) {
    await Orden.actualizarEstado(orden.ordenId, 'EN_DLQ');
    console.log(`[DLQ] CB abierto → ${orden.ordenId?.slice(0,8)}`); return;
  }

  for (let i = 1; i <= MAX_INTENTOS; i++) {
    try {
      console.log(`[ERP] 📤 Intento ${i}/${MAX_INTENTOS} → ${orden.ordenId?.slice(0,8)}`);
      const ok = await llamar(orden);
      if (ok) {
        cb.exito();
        await Orden.actualizarEstado(orden.ordenId, 'CONFIRMADA');
        console.log(`[ERP] ✅ CONFIRMADA → ${orden.ordenId?.slice(0,8)}`);
        await notificacionCtrl.enviarEmail(orden);
        return;
      }
    } catch (e) {
      console.error(`[ERP] ❌ Intento ${i}: ${e.message}`);
      cb.fallo();
      if (cb.estado === 'ABIERTO') break;
      if (i < MAX_INTENTOS) { await sleep(Math.pow(2,i-1)*1000); }
    }
  }
  await Orden.actualizarEstado(orden.ordenId, 'EN_DLQ');
  console.log(`[DLQ] ⚠️ → ${orden.ordenId?.slice(0,8)}`);
}

async function llamar(orden) {
  const url = process.env.LOGISCORE_URL;
  if (!url || url.includes('TU_ID')) {
    await sleep(200); console.log('[ERP] 🎭 LogisCore simulado → OK'); return true;
  }
  const res = await fetch(url, {
    method: 'POST', headers: {'Content-Type':'application/json'},
    body: JSON.stringify(orden), signal: AbortSignal.timeout(5000)
  });
  return res.ok;
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
function getEstado() { return cb.estado; }

module.exports = { enviarOrden, getCircuitBreakerEstado: getEstado };
