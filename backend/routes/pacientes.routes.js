'use strict';

function registerPacientesRoutes(router, service) {
  router.get('/api/pacientes/buscar', async ({ query }) => ({
    status: 200,
    body: await service.searchByHistory(query.historiaClinica ?? query.id)
  }));
  router.get('/api/pacientes/:id/historial', async ({ params }) => ({
    status: 200,
    body: await service.history(params.id)
  }));
  router.get('/api/pacientes', async ({ query }) => ({ status: 200, body: await service.list(query) }));
  router.get('/api/pacientes/:id', async ({ params }) => ({ status: 200, body: await service.get(params.id) }));
  router.post('/api/pacientes', async ({ body }) => ({ status: 201, body: await service.create(body) }));
  router.put('/api/pacientes/:id', async ({ params, body }) => ({ status: 200, body: await service.update(params.id, body) }));
  router.patch('/api/pacientes/:id', async ({ params, body }) => ({ status: 200, body: await service.update(params.id, body) }));
  router.delete('/api/pacientes/:id', async ({ params }) => ({ status: 200, body: await service.remove(params.id) }));
}

module.exports = registerPacientesRoutes;
