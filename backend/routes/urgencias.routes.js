'use strict';

function registerUrgenciasRoutes(router, service) {
  router.get('/api/urgencias', async ({ query }) => ({ status: 200, body: await service.list(query) }));
  router.post('/api/urgencias', async ({ body }) => ({ status: 201, body: await service.enter(body) }));
  router.post('/api/urgencias/siguiente', async () => ({ status: 200, body: await service.callNext() }));
  router.put('/api/urgencias/:pacienteId', async ({ params, body }) => ({
    status: 200, body: await service.update(params.pacienteId, body)
  }));
  router.patch('/api/urgencias/:pacienteId', async ({ params, body }) => ({
    status: 200, body: await service.update(params.pacienteId, body)
  }));
  router.delete('/api/urgencias/:pacienteId', async ({ params }) => ({
    status: 200, body: await service.remove(params.pacienteId)
  }));
}

module.exports = registerUrgenciasRoutes;
