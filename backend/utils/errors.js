'use strict';

class AppError extends Error {
  constructor(message, options = {}) {
    super(message);
    this.name = this.constructor.name;
    this.status = options.status || 500;
    this.code = options.code || 'INTERNAL_ERROR';
    this.details = options.details;
  }
}

class ValidationError extends AppError {
  constructor(message, details) {
    super(message, { status: 400, code: 'VALIDATION_ERROR', details });
  }
}

class NotFoundError extends AppError {
  constructor(message = 'Recurso no encontrado') {
    super(message, { status: 404, code: 'NOT_FOUND' });
  }
}

class ConflictError extends AppError {
  constructor(message, details) {
    super(message, { status: 409, code: 'CONFLICT', details });
  }
}

class PersistenceError extends AppError {
  constructor(message, details) {
    super(message, { status: 500, code: 'PERSISTENCE_ERROR', details });
  }
}

function isAppError(error) {
  return error instanceof AppError;
}

module.exports = {
  AppError,
  ValidationError,
  NotFoundError,
  ConflictError,
  PersistenceError,
  isAppError
};
