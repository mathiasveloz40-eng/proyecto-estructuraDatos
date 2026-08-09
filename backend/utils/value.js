'use strict';

const { ValidationError } = require('./errors');

function clone(value) {
  if (value === undefined) return undefined;
  return JSON.parse(JSON.stringify(value));
}

function requiredText(value, field, maxLength = 160) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new ValidationError(`El campo ${field} es obligatorio`, { campo: field });
  }
  const result = value.trim();
  if (result.length > maxLength) {
    throw new ValidationError(`El campo ${field} excede ${maxLength} caracteres`, { campo: field });
  }
  return result;
}

function optionalText(value, field, maxLength = 300) {
  if (value === undefined || value === null || value === '') return '';
  if (typeof value !== 'string') {
    throw new ValidationError(`El campo ${field} debe ser texto`, { campo: field });
  }
  const result = value.trim();
  if (result.length > maxLength) {
    throw new ValidationError(`El campo ${field} excede ${maxLength} caracteres`, { campo: field });
  }
  return result;
}

function positiveInteger(value, field) {
  const result = Number(value);
  if (!Number.isSafeInteger(result) || result <= 0) {
    throw new ValidationError(`El campo ${field} debe ser un entero positivo`, { campo: field });
  }
  return result;
}

function isoDate(value, field, options = {}) {
  const date = value === undefined || value === null || value === '' ? new Date() : new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new ValidationError(`El campo ${field} contiene una fecha inválida`, { campo: field });
  }
  if (options.notFuture && date.getTime() > Date.now()) {
    throw new ValidationError(`El campo ${field} no puede estar en el futuro`, { campo: field });
  }
  return options.dateOnly ? date.toISOString().slice(0, 10) : date.toISOString();
}

function includes(array, value) {
  for (let index = 0; index < array.length; index += 1) {
    if (array[index] === value) return true;
  }
  return false;
}

function booleanFromQuery(value) {
  if (value === undefined) return undefined;
  const normalized = String(value).trim().toLowerCase();
  if (normalized === 'true' || normalized === '1' || normalized === 'si' || normalized === 'sí') return true;
  if (normalized === 'false' || normalized === '0' || normalized === 'no') return false;
  throw new ValidationError('El filtro ocupada debe ser true o false', { campo: 'ocupada' });
}

module.exports = {
  clone,
  requiredText,
  optionalText,
  positiveInteger,
  isoDate,
  includes,
  booleanFromQuery
};
