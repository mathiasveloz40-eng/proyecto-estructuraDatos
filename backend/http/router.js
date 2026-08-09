'use strict';

const { AppError, NotFoundError } = require('../utils/errors');

class Router {
  constructor() {
    this.routes = [];
  }

  get(path, handler) { return this.register('GET', path, handler); }
  post(path, handler) { return this.register('POST', path, handler); }
  put(path, handler) { return this.register('PUT', path, handler); }
  patch(path, handler) { return this.register('PATCH', path, handler); }
  delete(path, handler) { return this.register('DELETE', path, handler); }

  register(method, routePath, handler) {
    this.routes.push({ method, routePath, segments: splitPath(routePath), handler });
    return this;
  }

  async dispatch(request, parsedUrl) {
    const method = request.method === 'HEAD' ? 'GET' : request.method;
    const pathSegments = splitPath(parsedUrl.pathname);
    let pathMatched = false;

    for (let index = 0; index < this.routes.length; index += 1) {
      const route = this.routes[index];
      const params = matchSegments(route.segments, pathSegments);
      if (params === null) continue;
      pathMatched = true;
      if (route.method !== method) continue;

      const query = {};
      for (const [key, value] of parsedUrl.searchParams.entries()) query[key] = value;
      const body = method === 'GET' ? {} : await readJsonBody(request);
      return route.handler({ request, params, query, body, parsedUrl });
    }

    if (pathMatched) {
      throw new AppError('Método HTTP no permitido para este recurso', {
        status: 405,
        code: 'METHOD_NOT_ALLOWED'
      });
    }
    throw new NotFoundError(`No existe el endpoint ${parsedUrl.pathname}`);
  }
}

function splitPath(value) {
  const normalized = String(value).replace(/^\/+|\/+$/g, '');
  return normalized === '' ? [] : normalized.split('/');
}

function matchSegments(routeSegments, pathSegments) {
  if (routeSegments.length !== pathSegments.length) return null;
  const params = {};
  for (let index = 0; index < routeSegments.length; index += 1) {
    const expected = routeSegments[index];
    let actual;
    try {
      actual = decodeURIComponent(pathSegments[index]);
    } catch (_error) {
      return null;
    }
    if (expected.startsWith(':')) params[expected.slice(1)] = actual;
    else if (expected !== actual) return null;
  }
  return params;
}

async function readJsonBody(request, maximumBytes = 1_048_576) {
  const chunks = [];
  let bytes = 0;
  for await (const chunk of request) {
    bytes += chunk.length;
    if (bytes > maximumBytes) {
      throw new AppError('El cuerpo de la solicitud excede 1 MB', {
        status: 413,
        code: 'PAYLOAD_TOO_LARGE'
      });
    }
    chunks.push(chunk);
  }
  if (bytes === 0) return {};
  const raw = Buffer.concat(chunks).toString('utf8');
  try {
    const body = JSON.parse(raw);
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      throw new Error('El cuerpo debe ser un objeto JSON');
    }
    return body;
  } catch (error) {
    throw new AppError('El cuerpo de la solicitud no contiene JSON válido', {
      status: 400,
      code: 'INVALID_JSON',
      details: { causa: error.message }
    });
  }
}

module.exports = Router;
module.exports.Router = Router;
module.exports.readJsonBody = readJsonBody;
