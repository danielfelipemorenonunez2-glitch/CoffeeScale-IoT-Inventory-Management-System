require('dotenv').config();

const parametros = {
  UMBRAL_ALERTA_PCT:     parseFloat(process.env.UMBRAL_ALERTA_PCT)     || 20,
  CAPACIDAD_SACO_GRAMOS: parseInt(process.env.CAPACIDAD_SACO_GRAMOS)   || 50000,
  MOCKAPI_BASE_URL:      process.env.MOCKAPI_BASE_URL || '',
  LOGISCORE_URL:         process.env.LOGISCORE_URL    || '',

  getPesoUmbral() {
    return (this.UMBRAL_ALERTA_PCT / 100) * this.CAPACIDAD_SACO_GRAMOS;
  },
  getPorcentaje(pesoGramos) {
    return Math.min(100, Math.round((pesoGramos / this.CAPACIDAD_SACO_GRAMOS) * 100));
  }
};

module.exports = parametros;
