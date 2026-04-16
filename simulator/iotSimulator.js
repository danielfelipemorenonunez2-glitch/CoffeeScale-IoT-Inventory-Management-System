require('dotenv').config();
const crypto = require('crypto');
const fetch  = require('node-fetch');

const SECRET  = process.env.SECRET_KEY || 'coffeescale-secret-2025';
const API_URL = `https://web-production-0cd54e.up.railway.app/api/telemetry`;
const BASCULAS = [
  { deviceId: 'BSC-001', tiendaId: 'TIENDA-01', peso: 48000 },
  { deviceId: 'BSC-002', tiendaId: 'TIENDA-02', peso: 35000 },
  { deviceId: 'BSC-003', tiendaId: 'TIENDA-03', peso: 9200  },
  { deviceId: 'BSC-004', tiendaId: 'TIENDA-04', peso: 50000 },
  { deviceId: 'BSC-005', tiendaId: 'TIENDA-05', peso: 11500 },
];

const pesos = {};
BASCULAS.forEach(b => { pesos[b.deviceId] = b.peso; });

function token(deviceId, timestamp, pesoGramos) {
  return crypto.createHmac('sha256', SECRET).update(`${deviceId}:${timestamp}:${pesoGramos}`).digest('hex');
}

async function enviar(b) {
  const timestamp  = new Date().toISOString();
  pesos[b.deviceId] = Math.max(0, pesos[b.deviceId] - Math.floor(Math.random()*800+100));
  const pesoGramos  = pesos[b.deviceId];
  const bateria     = Math.floor(Math.random()*30+70);
  try {
    const res  = await fetch(API_URL, {
      method: 'POST', headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ deviceId: b.deviceId, tiendaId: b.tiendaId, timestamp, pesoGramos, bateria, tokenHMAC: token(b.deviceId, timestamp, pesoGramos) }),
      signal: AbortSignal.timeout(5000)
    });
    const data = await res.json();
    console.log(`[SIM] ${b.deviceId} | ${pesoGramos}g (${data.porcentaje}%) | ${data.enAlerta ? '🚨 ALERTA' : '✅ OK'}`);
  } catch (e) {
    if (e.code === 'ECONNREFUSED') { console.error('❌ Servidor no disponible. Ejecuta: npm start'); process.exit(1); }
    console.error(`[SIM] Error ${b.deviceId}:`, e.message);
  }
}

async function spoofing() {
  console.log('\n[SIM] 🕵️  Ataque spoofing (token falso)...');
  const res = await fetch(API_URL, {
    method: 'POST', headers: {'Content-Type':'application/json'},
    body: JSON.stringify({ deviceId:'ATACANTE', tiendaId:'FAKE', timestamp: new Date().toISOString(), pesoGramos:0, bateria:100, tokenHMAC:'token_falso_abc123' }),
    signal: AbortSignal.timeout(5000)
  });
  const d = await res.json();
  console.log(`[SIM] Respuesta: ${res.status} → ${d.error || 'OK'}\n`);
}

console.log('══════════════════════════════════════');
console.log('  ☕ Simulador IoT - CoffeeScale');
console.log('  API:', API_URL);
console.log('══════════════════════════════════════\n');

BASCULAS.forEach(b => enviar(b));
setTimeout(spoofing, 3000);
setInterval(() => { console.log('\n─── Nuevo ciclo ───'); BASCULAS.forEach(b => enviar(b)); }, 5000);
