require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const path    = require('path');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'src/views')));

const telemetryRoutes = require('./src/routes/telemetryRoutes');
app.use('/api', telemetryRoutes);

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'src/views/panel.html'));
});

app.use((req, res) => {
  res.status(404).json({
    error: 'Ruta no encontrada',
    rutas: ['/api/health', '/api/status', '/api/ordenes', '/api/logs', '/api/telemetry']
  });
});

app.use((err, req, res, next) => {
  console.error('[ERROR]', err.message);
  res.status(500).json({ error: 'Error interno' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log('\n══════════════════════════════════════════');
  console.log('  ☕ COFFEESCALE MVP - Andina Roasters');
  console.log('══════════════════════════════════════════');
  console.log(`  🌐 http://localhost:${PORT}`);
  console.log(`  ❤️  http://localhost:${PORT}/api/health`);
  console.log('══════════════════════════════════════════\n');
  console.log('  ▶ Simular básculas: npm run simulate\n');
});

module.exports = app;
