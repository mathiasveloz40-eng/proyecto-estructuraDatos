'use strict';

const path = require('path');
const JsonStore = require('./persistence/JsonStore');
const Router = require('./http/router');
const { sendJson, sendEmpty, sendError } = require('./http/response');
const { serveStatic } = require('./http/static');
const { createSeedData } = require('./data/seed');
const PacientesService = require('./services/pacientes.service');
const UrgenciasService = require('./services/urgencias.service');
const CamasService = require('./services/camas.service');
const MovimientosService = require('./services/movimientos.service');
const RutasService = require('./services/rutas.service');
const ActividadService = require('./services/actividad.service');
const DashboardService = require('./services/dashboard.service');
const HospitalService = require('./services/hospital.service');
const registerPacientesRoutes = require('./routes/pacientes.routes');
const registerUrgenciasRoutes = require('./routes/urgencias.routes');
const registerCamasRoutes = require('./routes/camas.routes');
const registerMovimientosRoutes = require('./routes/movimientos.routes');
const registerHospitalRoutes = require('./routes/hospital.routes');

function createApplication(options = {}) {
  const dataFile = path.resolve(
    options.dataFile || process.env.HOSPITAL_DATA_FILE || path.join(__dirname, 'data', 'database.json')
  );
  const frontendDirectory = path.resolve(options.frontendDirectory || path.join(__dirname, '..', 'frontend'));
  const store = new JsonStore(dataFile, options.seedFactory || createSeedData);
  const services = {
    pacientes: new PacientesService(store),
    urgencias: new UrgenciasService(store),
    camas: new CamasService(store),
    movimientos: new MovimientosService(store),
    rutas: new RutasService(),
    actividad: new ActividadService(store),
    dashboard: new DashboardService(store),
    hospital: new HospitalService(store)
  };
  const router = new Router();
  registerPacientesRoutes(router, services.pacientes);
  registerUrgenciasRoutes(router, services.urgencias);
  registerCamasRoutes(router, services.camas);
  registerMovimientosRoutes(router, services.movimientos);
  registerHospitalRoutes(router, services);

  async function handler(request, response) {
    const parsedUrl = new URL(request.url, 'http://localhost');
    if (request.method === 'OPTIONS') {
      sendEmpty(response, 204);
      return;
    }
    if (parsedUrl.pathname === '/api' || parsedUrl.pathname.startsWith('/api/')) {
      try {
        await store.initialize();
        const result = await router.dispatch(request, parsedUrl);
        sendJson(
          response,
          result && result.status ? result.status : 200,
          result && Object.prototype.hasOwnProperty.call(result, 'body') ? result.body : result,
          request.method,
          result && result.headers ? result.headers : undefined
        );
      } catch (error) {
        sendError(response, error, request.method);
      }
      return;
    }

    try {
      await serveStatic(request, response, frontendDirectory, parsedUrl);
    } catch (error) {
      sendError(response, error, request.method);
    }
  }

  return {
    dataFile,
    frontendDirectory,
    store,
    services,
    router,
    handler,
    initialize: () => store.initialize()
  };
}

module.exports = { createApplication };
