const crypto       = require('crypto');
const LogAuditoria = require('../models/LogAuditoria');

async function validarHMAC(req, res, next) {
  const { deviceId, timestamp, pesoGramos, tokenHMAC } = req.body;
  const ip = req.ip || 'unknown';

  if (!deviceId || !timestamp || pesoGramos == null || !tokenHMAC) {
    await LogAuditoria.registrar(deviceId, ip, 'ESQUEMA_INVALIDO', 'Faltan campos requeridos');
    return res.status(400).json({ error: 'Payload incompleto', campos_requeridos: ['deviceId','timestamp','pesoGramos','tokenHMAC'] });
  }

  const payloadStr    = `${deviceId}:${timestamp}:${pesoGramos}`;
  const tokenEsperado = crypto
    .createHmac('sha256', process.env.SECRET_KEY || 'coffeescale-secret-2025')
    .update(payloadStr)
    .digest('hex');

  let valido = false;
  try {
    valido = crypto.timingSafeEqual(
      Buffer.from(tokenHMAC.padEnd(64,'0').slice(0,64)),
      Buffer.from(tokenEsperado)
    );
  } catch { valido = false; }

  if (!valido) {
    await LogAuditoria.registrar(deviceId, ip, 'TOKEN_INVALIDO', 'HMAC inválido - posible spoofing');
    return res.status(401).json({ error: 'Token inválido. Dispositivo no autorizado.', deviceId });
  }

  await LogAuditoria.registrar(deviceId, ip, 'MENSAJE_ACEPTADO', 'Token HMAC válido');
  next();
}

module.exports = validarHMAC;
