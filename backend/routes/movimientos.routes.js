'use strict';

function registerMovimientosRoutes(router, service) {
  router.get('/api/movimientos', async ({ query }) => ({ status: 200, body: await service.list(query) }));
  router.get('/api/movimientos/:id', async ({ params }) => ({ status: 200, body: await service.get(params.id) }));
  router.post('/api/movimientos', async ({ body }) => ({ status: 201, body: await service.create(body) }));
  router.put('/api/movimientos/:id', async ({ params, body }) => ({ status: 200, body: await service.update(params.id, body) }));
  router.patch('/api/movimientos/:id', async ({ params, body }) => ({ status: 200, body: await service.update(params.id, body) }));
  router.delete('/api/movimientos/:id', async ({ params }) => ({ status: 200, body: await service.remove(params.id) }));
}

module.exports = registerMovimientosRoutes;
