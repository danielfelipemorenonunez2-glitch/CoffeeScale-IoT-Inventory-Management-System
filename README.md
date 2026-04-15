# ☕ CoffeeScale – IoT Inventory Management System

> **Proyecto Universitario** · Ingeniería de Software 2 · 2025  
> Grupo 3: Daniel Felipe Moreno Nuñez · Paula Alejandra Arias Buitrago · David Felipe Bejarano Montes

---

## ¿Qué es CoffeeScale?

CoffeeScale es un sistema de monitoreo de inventario IoT para **Andina Roasters**, la cadena de cafeterías de especialidad más grande del país. El sistema recibe telemetría de básculas inteligentes instaladas en cada tienda y genera automáticamente órdenes de reposición cuando el inventario de café llega a un nivel crítico.

Este repositorio implementa el **MVP del backend** diseñado en el Quality Attribute Workshop (QAW) de la clase, demostrando los 4 escenarios de calidad más críticos del sistema.

---

## Arquitectura del Sistema

```
Básculas IoT ──HTTPS──► API Gateway ──► Lambda Validador (HMAC)
                                              │
                                         SQS Cola Ingesta
                                              │
                                        Lambda Procesador
                                         │          │
                                     DynamoDB    SQS Cola Alertas
                                     (estado)         │
                                              Lambda Orquestador
                                               │    (throttling 1/s)
                                          LogisCore ERP ──► Email Gerente
```

**Patrón:** Serverless + Event-Driven  
**Restricción:** Free Tier ($0/mes en fase piloto)

---

## Escenarios QAW Implementados

| Escenario | Atributo | Implementación | Archivo |
|-----------|----------|----------------|---------|
| ESC-01 | Rendimiento | Cola SQS buffer 10.000 msg/min | `controllers/umbralController.js` |
| ESC-02 | Costo $0 | JSON local simula DynamoDB Free Tier | `models/Bascula.js` |
| ESC-03 | Seguridad | Validación HMAC-SHA256 | `middlewares/hmacValidator.js` |
| ESC-04 | Confiabilidad | Throttling 1 req/s + Circuit Breaker | `controllers/erpController.js` |
| ESC-05 | Modificabilidad | Parámetros en `.env` sin redespliegue | `config/parametros.js` |

---

## Estructura del Proyecto (MVC)

```
coffeescale/
│
├── app.js                          ← Servidor Express (entrada principal)
├── package.json
├── .env.example                    ← Variables de entorno (copiar a .env)
│
├── simulator/
│   └── iotSimulator.js             ← Simula 5 básculas IoT enviando datos
│
├── src/
│   ├── models/                     ── M (Model)
│   │   ├── Bascula.js              ← Estado actual de básculas (simula DynamoDB)
│   │   ├── Orden.js                ← Órdenes de reposición
│   │   └── LogAuditoria.js         ← Log de seguridad (ESC-03)
│   │
│   ├── controllers/                ── C (Controller)
│   │   ├── ingestaController.js    ← Recibe y procesa telemetría (ESC-01)
│   │   ├── umbralController.js     ← Evalúa umbrales + cola de alertas (ESC-01)
│   │   ├── erpController.js        ← Circuit Breaker + throttling LogisCore (ESC-04)
│   │   └── notificacionController.js ← Email al gerente (ESC-06)
│   │
│   ├── views/                      ── V (View)
│   │   └── panel.html              ← Dashboard corporativo en tiempo real
│   │
│   ├── middlewares/
│   │   └── hmacValidator.js        ← Validación criptográfica (ESC-03)
│   │
│   ├── config/
│   │   └── parametros.js           ← Umbrales y capacidades configurables (ESC-05)
│   │
│   └── routes/
│       └── telemetryRoutes.js      ← Endpoints REST de la API
│
└── data/                           ← "Base de datos" local (simula DynamoDB)
    ├── basculas.json
    ├── ordenes.json
    └── auditoria.json
```

---

## Instalación y Ejecución

### Prerrequisitos

- Node.js 18+ instalado
- Cuenta de GitHub (para subir el repo)
- Opcional: cuenta Gmail para probar emails

### 1. Clonar el repositorio

```bash
git clone https://github.com/TU_USUARIO/coffeescale.git
cd coffeescale
```

### 2. Instalar dependencias

```bash
npm install
```

### 3. Configurar variables de entorno

```bash
cp .env.example .env
```

Editar `.env`:

```env
PORT=3000
SECRET_KEY=coffeescale-secret-2025

LOGISCORE_URL=http://localhost:4000/orders

# Email (opcional - si no configuras, el sistema igual funciona)
EMAIL_USER=tucorreo@gmail.com
EMAIL_PASS=tu_app_password_de_gmail
EMAIL_DEST=gerente@tienda.com

# Parámetros de negocio (ESC-05 - cambiar sin tocar código)
UMBRAL_ALERTA_PCT=20
CAPACIDAD_SACO_GRAMOS=50000
```

### 4. Crear archivos de datos vacíos

```bash
echo "[]" > data/basculas.json
echo "[]" > data/ordenes.json
echo "[]" > data/auditoria.json
```

### 5. Iniciar el servidor

```bash
npm start
```

Verás:
```
CoffeeScale corriendo en http://localhost:3000
Panel: http://localhost:3000/
API:   http://localhost:3000/api/status
```

### 6. Iniciar el simulador IoT (en otra terminal)

```bash
npm run simulate
```

Verás cómo las 5 básculas van enviando datos:
```
[SIM] BSC-001 → 48000g | Alerta: false
[SIM] BSC-003 → 8500g  | Alerta: true
[ALERTA] Báscula BSC-003 en tienda TIENDA-03
[THROTTLING] Procesando orden para TIENDA-03
[ERP] Orden abc123 CONFIRMADA
[EMAIL] Notificación enviada
```

### 7. Ver el panel

Abrir en el navegador: **http://localhost:3000**

---

## Endpoints de la API

| Método | Endpoint | Descripción | Autenticación |
|--------|----------|-------------|---------------|
| `POST` | `/api/telemetry` | Recibir telemetría de báscula | HMAC requerido |
| `GET`  | `/api/status` | Estado de todas las básculas | No |
| `GET`  | `/api/status/:tiendaId` | Estado de una tienda | No |
| `GET`  | `/api/ordenes` | Historial de órdenes | No |

### Ejemplo de petición (como la envía la báscula)

```bash
curl -X POST http://localhost:3000/api/telemetry \
  -H "Content-Type: application/json" \
  -d '{
    "deviceId": "BSC-001",
    "tiendaId": "TIENDA-01",
    "timestamp": "2025-01-15T10:30:00.000Z",
    "pesoGramos": 8500,
    "bateria": 75,
    "tokenHMAC": "GENERAR_CON_SCRIPT"
  }'
```

> El token HMAC se genera automáticamente en el simulador.  
> Si el token es inválido, recibes: `401 Token inválido. Dispositivo no autorizado.`

---

## Cómo probar cada Escenario QAW

### ESC-03 – Seguridad: probar rechazo de dispositivo falso

```bash
# Petición sin token (debe ser rechazada con 400)
curl -X POST http://localhost:3000/api/telemetry \
  -H "Content-Type: application/json" \
  -d '{"deviceId":"ATACANTE","pesoGramos":0}'

# Respuesta esperada:
# {"error": "Payload incompleto"}
```

### ESC-05 – Modificabilidad: cambiar umbral sin redespliegue

```bash
# Editar .env y cambiar:
UMBRAL_ALERTA_PCT=30   # Antes era 20

# Reiniciar servidor (en producción: Parameter Store, sin reinicio)
npm start
# El nuevo umbral aplica inmediatamente, sin cambiar ningún archivo .js
```

### ESC-04 – Confiabilidad: ver el throttling en acción

```bash
# Ver en los logs del servidor cómo las alertas se procesan de a 1 por segundo:
# [THROTTLING] Procesando orden para TIENDA-01 (4 restantes)
# [THROTTLING] Procesando orden para TIENDA-02 (3 restantes)
# ...
```

---

## Subir a GitHub

```bash
# Desde la carpeta del proyecto
git init
git add .
git commit -m "feat: CoffeeScale MVP - QAW Ingenieria de Software 2"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/coffeescale.git
git push -u origin main
```

> ⚠️ **Importante:** El archivo `.env` está en `.gitignore` por seguridad.  
> Sube solo `.env.example` con valores de ejemplo.

---

## Relación con el QAW

Este código implementa directamente los resultados del Quality Attribute Workshop:

| Decisión de Diseño (QAW) | Implementación en Código |
|--------------------------|--------------------------|
| Serverless + Event-Driven | Express + colas en memoria (`umbralController.js`) |
| Sin base de datos relacional | Archivos JSON en `data/` |
| Solo estado actual (no histórico) | `Bascula.upsert()` sobreescribe el registro |
| Validación criptográfica antes de lógica | Middleware `hmacValidator.js` en la ruta |
| Throttling 1 req/s a LogisCore | `setInterval(1000)` en `umbralController.js` |
| Circuit Breaker | Estados CERRADO/ABIERTO/SEMIABIERTO en `erpController.js` |
| Parámetros externalizados | Variables en `.env` leídas por `parametros.js` |

---

## Tecnologías Utilizadas

| Tecnología | Uso | Equivalente en Producción |
|------------|-----|---------------------------|
| Node.js + Express | Servidor web | AWS Lambda |
| JSON files | Almacenamiento | AWS DynamoDB |
| Colas en memoria | Mensajería | AWS SQS |
| `crypto` (built-in) | HMAC-SHA256 | Mismo |
| Nodemailer | Emails | AWS SES |
| HTML/CSS/JS | Panel web | Vercel + Next.js |

---

## Autores

| Nombre | Cédula | Rol |
|--------|--------|-----|
| Daniel Felipe Moreno Nuñez | 1023082039 | Líder del Equipo |
| Paula Alejandra Arias Buitrago | 1014857037 | Integrante |
| David Felipe Bejarano Montes | 1005754699 | Integrante |

---

## Referencias

1. Bass, L., Clements, P., & Kazman, R. (2022). *Software Architecture in Practice* (4th ed.). Addison-Wesley.
2. SEI. *Quality Attribute Workshops (QAWs), Third Edition*. https://doi.org/10.1184/R1/6582656.v1
3. Jonas, E. et al. (2019). *Cloud Programming Simplified: A Berkeley View on Serverless Computing*. arXiv:1902.03383
