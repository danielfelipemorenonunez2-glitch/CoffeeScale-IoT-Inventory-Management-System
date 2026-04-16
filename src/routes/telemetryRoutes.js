const express      = require('express');
const router       = express.Router();
const validarHMAC  = require('../middlewares/hmacValidator');
const ingestaCtrl  = require('../controllers/ingestaController');
const umbralCtrl   = require('../controllers/umbralController');
const erpCtrl      = require('../controllers/erpController');
const Bascula      = require('../models/Bascula');
const Orden        = require('../models/Orden');
const LogAuditoria = require('../models/LogAuditoria');
const parametros   = require('../config/parametros');

// POST /api/telemetry — recibir datos de báscula (HMAC requerido)
router.post('/telemetry', validarHMAC, ingestaCtrl.procesarTelemetria);

// GET /api/status
router.get('/status', async (req, res) => {
  try {
    const basculas = await Bascula.getAll();
    const umbral   = parametros.getPesoUmbral();
    res.json({
      total:    basculas.length,
      alertas:  basculas.filter(b => b.pesoGramos <= umbral).length,
      umbralPct: parametros.UMBRAL_ALERTA_PCT,
      basculas: basculas.map(b => ({
        ...b,
        porcentaje: parametros.getPorcentaje(b.pesoGramos),
        enAlerta:   b.pesoGramos <= umbral
      }))
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/status/:tiendaId
router.get('/status/:tiendaId', async (req, res) => {
  try {
    const basculas = await Bascula.findByTienda(req.params.tiendaId);
    const umbral   = parametros.getPesoUmbral();
    res.json({ tiendaId: req.params.tiendaId, total: basculas.length,
      basculas: basculas.map(b => ({ ...b, porcentaje: parametros.getPorcentaje(b.pesoGramos), enAlerta: b.pesoGramos <= umbral }))
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/ordenes
router.get('/ordenes', async (req, res) => {
  try {
    const ordenes = await Orden.getAll();
    res.json({
      total:       ordenes.length,
      confirmadas: ordenes.filter(o => o.estado === 'CONFIRMADA').length,
      enDLQ:       ordenes.filter(o => o.estado === 'EN_DLQ').length,
      ordenes
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/logs
router.get('/logs', async (req, res) => {
  try {
    const logs     = await LogAuditoria.getAll();
    const rechazos = logs.filter(l => l.tipoEvento === 'TOKEN_INVALIDO').length;
    res.json({ total: logs.length, rechazos, logs: logs.slice(-50) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/health
router.get('/health', (req, res) => {
  res.json({
    status: 'UP', sistema: 'CoffeeScale MVP', version: '1.0.0',
    timestamp: new Date().toISOString(),
    circuitBreaker: erpCtrl.getCircuitBreakerEstado(),
    colaAlertas:    umbralCtrl.getTamanoCola(),
    mockapi:        process.env.MOCKAPI_BASE_URL ? 'configurado' : 'local',
    parametros: {
      umbralPct:       parametros.UMBRAL_ALERTA_PCT,
      capacidadGramos: parametros.CAPACIDAD_SACO_GRAMOS,
      pesoUmbral:      parametros.getPesoUmbral()
    }
  });
});

module.exports = router;
