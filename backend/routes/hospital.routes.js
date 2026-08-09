'use strict';

const { ValidationError } = require('../utils/errors');

function registerHospitalRoutes(router, services) {
  router.get('/api/salud', async () => ({
    status: 200,
    body: { estado: 'operativo', servicio: 'Hospital Flow API', fecha: new Date().toISOString() }
  }));
  router.get('/api/dashboard', async () => ({ status: 200, body: await services.dashboard.get() }));
  router.get('/api/catalogos', async () => ({ status: 200, body: await services.hospital.catalogs() }));
  router.get('/api/configuracion', async () => ({ status: 200, body: await services.hospital.catalogs() }));
  router.get('/api/actividad', async ({ query }) => ({ status: 200, body: await services.actividad.list(query) }));
  router.post('/api/deshacer', async () => ({ status: 200, body: await services.actividad.undo() }));
  router.get('/api/rutas/areas', async () => ({ status: 200, body: services.rutas.catalog() }));
  router.get('/api/rutas', async ({ query }) => ({
    status: 200,
    body: services.rutas.calculate(query.origen, query.destino)
  }));
  router.get('/api/busqueda', async ({ query }) => {
    if (!query.q || String(query.q).trim() === '') {
      throw new ValidationError('Debe indicar el texto de búsqueda', { campo: 'q' });
    }
    const patients = await services.pacientes.list({ buscar: query.q, orden: 'nombre' });
    return { status: 200, body: { pacientes: patients.slice(0, 10), total: patients.length } };
  });
}

module.exports = registerHospitalRoutes;
