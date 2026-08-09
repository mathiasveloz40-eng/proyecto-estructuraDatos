'use strict';

const fs = require('fs');
const path = require('path');
const { commonHeaders } = require('./response');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2'
};

async function serveStatic(request, response, frontendDirectory, parsedUrl) {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    sendPlain(response, 405, 'Método HTTP no permitido para archivos estáticos', {
      Allow: 'GET, HEAD'
    });
    return;
  }

  let decodedPath;
  try {
    decodedPath = decodeURIComponent(parsedUrl.pathname);
  } catch (_error) {
    sendPlain(response, 400, 'Solicitud inválida');
    return;
  }

  const root = path.resolve(frontendDirectory);
  const relativeRequest = decodedPath === '/' ? '/index.html' : decodedPath;
  let filePath = path.resolve(root, `.${relativeRequest}`);
  if (!isInside(root, filePath)) {
    sendPlain(response, 403, 'Acceso denegado');
    return;
  }

  let stats = await statOrNull(filePath);
  if (stats && stats.isDirectory()) {
    filePath = path.join(filePath, 'index.html');
    stats = await statOrNull(filePath);
  }
  if (!stats || !stats.isFile()) {
    if (request.method === 'GET' && path.extname(relativeRequest) === '') {
      filePath = path.join(root, 'index.html');
      stats = await statOrNull(filePath);
    }
  }
  if (!stats || !stats.isFile()) {
    sendPlain(response, 404, 'Recurso no encontrado');
    return;
  }

  const extension = path.extname(filePath).toLowerCase();
  const headers = commonHeaders({
    'Content-Type': MIME_TYPES[extension] || 'application/octet-stream',
    'Content-Length': stats.size,
    'Cache-Control': extension === '.html' ? 'no-cache' : 'public, max-age=3600'
  });
  response.writeHead(200, headers);
  if (request.method === 'HEAD') {
    response.end();
    return;
  }
  const stream = fs.createReadStream(filePath);
  stream.on('error', () => {
    if (!response.headersSent) sendPlain(response, 500, 'No se pudo leer el recurso');
    else response.destroy();
  });
  stream.pipe(response);
}

function isInside(root, candidate) {
  return candidate === root || candidate.startsWith(`${root}${path.sep}`);
}

async function statOrNull(filePath) {
  try {
    return await fs.promises.stat(filePath);
  } catch (error) {
    if (error.code === 'ENOENT' || error.code === 'ENOTDIR') return null;
    throw error;
  }
}

function sendPlain(response, status, message, extraHeaders = {}) {
  const payload = Buffer.from(message, 'utf8');
  response.writeHead(status, commonHeaders({
    'Content-Type': 'text/plain; charset=utf-8',
    'Content-Length': payload.length,
    ...extraHeaders
  }));
  response.end(payload);
}

module.exports = { serveStatic };
