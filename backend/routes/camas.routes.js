'use strict';

function registerCamasRoutes(router, service) {
  router.get('/api/camas', async ({ query }) => ({ status: 200, body: await service.list(query) }));
  router.post('/api/camas/asignar', async ({ body }) => ({ status: 200, body: await service.assign(body) }));
  router.post('/api/camas/liberar', async ({ body }) => ({ status: 200, body: await service.release(body) }));
}

module.exports = registerCamasRoutes;
