const fs   = require('fs');
const path = require('path');
const LOCAL = path.join(__dirname, '../../data/auditoria.json');

function ensure() {
  if (!fs.existsSync(LOCAL)) {
    fs.mkdirSync(path.dirname(LOCAL), { recursive: true });
    fs.writeFileSync(LOCAL, '[]');
  }
}
function read()      { ensure(); try { return JSON.parse(fs.readFileSync(LOCAL,'utf-8')); } catch { return []; } }
function write(data) { ensure(); fs.writeFileSync(LOCAL, JSON.stringify(data, null, 2)); }
function useMock()   { return false; } // ← CAMBIO: logs siempre locales (free tier MockAPI = 2 recursos)

const EMOJI = { TOKEN_INVALIDO:'🔴', ESQUEMA_INVALIDO:'🟡', MENSAJE_ACEPTADO:'🟢' };

const LogAuditoria = {
  async registrar(deviceId, ip, tipoEvento, motivo) {
    const entrada = { timestamp: new Date().toISOString(), deviceId: deviceId||'DESCONOCIDO', ip: ip||'unknown', tipoEvento, motivo };
    console.log(`[AUDIT] ${EMOJI[tipoEvento]||'⚪'} ${tipoEvento} | ${deviceId} | ${motivo}`);
    if (useMock()) {
      try { await require('../config/mockapi').crearLog(entrada); return; } catch {}
    }
    const logs = read(); logs.push(entrada); write(logs);
  },
  async getAll() {
    if (useMock()) { try { return await require('../config/mockapi').getLogs(); } catch {} }
    return read();
  },
  async contarRechazos() {
    return (await this.getAll()).filter(l => l.tipoEvento === 'TOKEN_INVALIDO').length;
  }
};

module.exports = LogAuditoria;
