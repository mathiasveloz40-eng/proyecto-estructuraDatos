'use strict';

const { isAppError } = require('../utils/errors');

function commonHeaders(extra = {}) {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Accept',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'same-origin',
    ...extra
  };
}

function sendJson(response, status, value, requestMethod = 'GET', headers = {}) {
  const payload = JSON.stringify(value);
  response.writeHead(status, commonHeaders({
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(payload),
    'Cache-Control': 'no-store',
    ...headers
  }));
  if (requestMethod === 'HEAD') response.end();
  else response.end(payload);
}

function sendEmpty(response, status = 204) {
  response.writeHead(status, commonHeaders());
  response.end();
}

function sendError(response, error, requestMethod = 'GET') {
  const known = isAppError(error);
  const status = known ? error.status : 500;
  const body = {
    error: {
      code: known ? error.code : 'INTERNAL_ERROR',
      message: known ? error.message : 'Ocurrió un error interno en el servidor'
    }
  };
  if (known && error.details !== undefined) body.error.details = error.details;
  if (!known && process.env.NODE_ENV !== 'test') console.error(error);
  sendJson(response, status, body, requestMethod);
}

module.exports = { commonHeaders, sendJson, sendEmpty, sendError };
