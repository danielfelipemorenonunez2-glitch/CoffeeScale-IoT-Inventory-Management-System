const Bascula    = require('../models/Bascula');
const parametros = require('../config/parametros');
const umbralCtrl = require('./umbralController');

async function procesarTelemetria(req, res) {
  const { deviceId, tiendaId, timestamp, pesoGramos, bateria } = req.body;
  try {
    await Bascula.upsert(deviceId, tiendaId, pesoGramos, bateria);
    const pesoUmbral = parametros.getPesoUmbral();
    const porcentaje = parametros.getPorcentaje(pesoGramos);
    const enAlerta   = pesoGramos <= pesoUmbral;

    if (enAlerta) {
      console.log(`[INGESTA] 🚨 ${deviceId} | ${pesoGramos}g (${porcentaje}%) ≤ umbral`);
      umbralCtrl.procesarAlerta(deviceId, tiendaId, pesoGramos);
    } else {
      console.log(`[INGESTA] ✅ ${deviceId} | ${pesoGramos}g (${porcentaje}%)`);
    }

    return res.status(200).json({
      status: 'OK', deviceId, tiendaId, pesoGramos, porcentaje,
      umbralPct: parametros.UMBRAL_ALERTA_PCT, enAlerta,
      timestamp: new Date().toISOString()
    });
  } catch (e) {
    console.error('[INGESTA] Error:', e.message);
    return res.status(500).json({ error: 'Error interno' });
  }
}

module.exports = { procesarTelemetria };
