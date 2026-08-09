'use strict';

const { insertionSort } = require('../algorithms/sorting');
const { linearSearch, linearSearchAll } = require('../algorithms/search');
const {
  AREAS,
  ESTADOS_MOVIMIENTO,
  canonicalArea,
  removeDiacritics
} = require('../config/catalogs');
const { positiveInteger, optionalText, isoDate, includes, clone } = require('../utils/value');
const { ValidationError, NotFoundError, ConflictError } = require('../utils/errors');
const {
  requirePatient,
  buildPatientHistory,
  replacePatientHistory,
  findPatientBed,
  findBedIndex,
  findUrgencyIndex,
  replacePatient,
  insertMovement,
  markMovementApplied,
  recordAction,
  publicMovement,
  fullName
} = require('./domain.helpers');

class MovimientosService {
  constructor(store) {
    this.store = store;
  }

  async list(query = {}) {
    const state = await this.store.read();
    let movements;
    if (query.pacienteId !== undefined && query.pacienteId !== '') {
      const patientId = positiveInteger(query.pacienteId, 'pacienteId');
      requirePatient(state, patientId);
      movements = buildPatientHistory(state, patientId).recorrer();
    } else {
      movements = state.movimientos.slice();
    }
    if (query.estado) {
      const status = normalizeMovementStatus(query.estado);
      movements = linearSearchAll(movements, (movement) => movement.estado === status);
    }
    if (query.area) {
      const area = canonicalArea(query.area);
      if (!area) throw new ValidationError('El área indicada no existe', { campo: 'area', permitidos: AREAS });
      movements = linearSearchAll(movements, (movement) => movement.areaDestino === area);
    }

    let enriched = [];
    for (let index = 0; index < movements.length; index += 1) {
      enriched.push(enrichMovement(state, movements[index]));
    }
    return sortMovements(enriched, query.orden || 'fecha', query.direccion || 'desc');
  }

  async get(id) {
    const state = await this.store.read();
    const index = linearSearch(state.movimientos, String(id), 'id');
    if (index === -1) throw new NotFoundError(`No existe el movimiento ${id}`);
    const movement = state.movimientos[index];
    const history = buildPatientHistory(state, movement.pacienteId);
    const indexedMovement = history.buscar(String(id));
    return enrichMovement(state, indexedMovement);
  }

  async create(payload = {}) {
    const patientId = positiveInteger(payload.pacienteId, 'pacienteId');
    const destination = validateArea(payload.areaDestino ?? payload.area, 'area');
    const status = normalizeMovementStatus(payload.estado || 'completado');
    const date = isoDate(payload.fecha, 'fecha', { notFuture: status === 'completado' });
    const description = optionalText(payload.descripcion, 'descripcion', 300) || `Traslado a ${destination}`;

    return this.store.mutate((state) => {
      const patient = requirePatient(state, patientId);
      const previousPatient = clone(patient);
      const releasedBed = status === 'completado' ? releaseBedIfLeaving(state, patient, destination) : null;
      const previousUrgency = status === 'completado'
        ? updateUrgencyForDestination(state, patient.id, destination)
        : null;
      const movement = insertMovement(state, {
        pacienteId: patient.id,
        areaOrigen: patient.areaActual,
        areaDestino: destination,
        fecha: date,
        descripcion: description,
        estado: status,
        contextoAnterior: status === 'completado' ? {
          paciente: previousPatient,
          cama: releasedBed,
          urgencia: previousUrgency
        } : null
      });
      if (status === 'completado' && destination !== previousPatient.areaActual) {
        applyDestination(patient, destination);
      }

      recordAction(state, {
        tipo: status === 'completado' ? 'CAMBIO_AREA' : 'CREAR_TRASLADO',
        descripcion: status === 'completado'
          ? `${fullName(patient)} fue trasladado a ${destination}`
          : `Se solicitó el traslado de ${fullName(patient)} a ${destination}`,
        entidad: { tipo: 'movimiento', id: movement.id },
        undo: {
          paciente: previousPatient,
          movimientoId: movement.id,
          cama: releasedBed,
          urgencia: previousUrgency
        }
      });
      return enrichMovement(state, movement);
    });
  }

  async update(id, payload = {}) {
    return this.store.mutate((state) => {
      const movementIndex = linearSearch(state.movimientos, String(id), 'id');
      if (movementIndex === -1) throw new NotFoundError(`No existe el movimiento ${id}`);
      const previousMovement = clone(state.movimientos[movementIndex]);
      const patient = requirePatient(state, previousMovement.pacienteId);
      const previousPatient = clone(patient);
      const history = buildPatientHistory(state, patient.id);
      const current = history.buscar(String(id));
      if (!current) throw new NotFoundError(`No existe el movimiento ${id} en el historial`);

      const destination = payload.areaDestino !== undefined || payload.area !== undefined
        ? validateArea(payload.areaDestino ?? payload.area, 'area')
        : current.areaDestino;
      const status = payload.estado !== undefined ? normalizeMovementStatus(payload.estado) : current.estado;
      if (current.estado === 'completado' && status === 'pendiente') {
        throw new ConflictError('Un traslado completado no puede volver al estado pendiente');
      }
      const changes = {
        area: destination,
        areaDestino: destination,
        fecha: payload.fecha !== undefined
          ? isoDate(payload.fecha, 'fecha', { notFuture: status === 'completado' })
          : current.fecha,
        descripcion: payload.descripcion !== undefined
          ? optionalText(payload.descripcion, 'descripcion', 300)
          : current.descripcion,
        estado: status
      };
      if (status === 'completado' && new Date(changes.fecha).getTime() > Date.now()) {
        throw new ValidationError('Un traslado completado no puede tener fecha futura', { campo: 'fecha' });
      }
      let releasedBed = null;
      let previousUrgency = null;
      if (current.estado === 'pendiente' && status === 'completado') {
        releasedBed = releaseBedIfLeaving(state, patient, destination);
        previousUrgency = updateUrgencyForDestination(state, patient.id, destination);
        changes.areaOrigen = patient.areaActual;
        changes.contextoAnterior = {
          paciente: previousPatient,
          cama: releasedBed,
          urgencia: previousUrgency
        };
        markMovementApplied(state, changes);
        if (destination !== previousPatient.areaActual) applyDestination(patient, destination);
      } else if (current.estado === 'completado' && destination !== current.areaDestino) {
        if (!isLatestCompletedMovement(state, current)) {
          throw new ConflictError('Solo se puede cambiar el destino del movimiento completado más reciente');
        }
        releasedBed = releaseBedIfLeaving(state, patient, destination);
        previousUrgency = updateUrgencyForDestination(state, patient.id, destination);
        applyDestination(patient, destination);
      }

      const updated = history.modificar(String(id), changes);
      replacePatientHistory(state, patient.id, history);
      recordAction(state, {
        tipo: 'ACTUALIZAR_MOVIMIENTO',
        descripcion: `El traslado de ${fullName(patient)} fue actualizado`,
        entidad: { tipo: 'movimiento', id: current.id },
        undo: {
          movimiento: previousMovement,
          paciente: previousPatient,
          cama: releasedBed,
          urgencia: previousUrgency
        }
      });
      return enrichMovement(state, updated);
    });
  }

  async remove(id) {
    return this.store.mutate((state) => {
      const movementIndex = linearSearch(state.movimientos, String(id), 'id');
      if (movementIndex === -1) throw new NotFoundError(`No existe el movimiento ${id}`);
      const movement = clone(state.movimientos[movementIndex]);
      const patient = requirePatient(state, movement.pacienteId);
      const previousPatient = clone(patient);
      const history = buildPatientHistory(state, patient.id);
      const originalHistory = history.recorrer();
      const originalPosition = linearSearch(originalHistory, String(id), 'id');
      const removed = history.eliminar(String(id));
      if (!removed) throw new NotFoundError(`No existe el movimiento ${id} en el historial`);

      let bedBeforeDelete = null;
      let urgencyBeforeDelete = null;
      if (movement.estado === 'completado' && isLatestCompletedMovement(state, movement)) {
        const context = findMovementContext(state, movement);
        if (context.cama) {
          const bedIndex = findBedIndex(state, context.cama.id);
          if (bedIndex === -1) throw new NotFoundError(`No existe la cama ${context.cama.id}`);
          bedBeforeDelete = clone(state.camas[bedIndex]);
          restoreBedForMovementDelete(state, context.cama);
        } else {
          const currentBed = findPatientBed(state, patient.id);
          if (currentBed && currentBed.area !== movement.areaOrigen) {
            bedBeforeDelete = clone(currentBed);
            currentBed.ocupada = false;
            currentBed.pacienteId = null;
          }
        }
        if (context.urgencia) {
          urgencyBeforeDelete = currentUrgencySnapshot(state, context.urgencia.id);
          restoreUrgencyForMovementDelete(state, context.urgencia);
        } else if (movement.areaDestino === 'Urgencias' && movement.areaOrigen !== 'Urgencias') {
          const activeUrgencyIndex = findUrgencyIndex(state, patient.id, true);
          if (activeUrgencyIndex !== -1) {
            urgencyBeforeDelete = clone(state.urgencias[activeUrgencyIndex]);
            state.urgencias[activeUrgencyIndex].estado = 'cancelado';
          }
        }
        if (context.paciente) replacePatient(state, context.paciente);
        else if (movement.areaOrigen) applyDestination(patient, movement.areaOrigen);
      }
      replacePatientHistory(state, patient.id, history);
      recordAction(state, {
        tipo: 'ELIMINAR_MOVIMIENTO',
        descripcion: `Se eliminó un evento del historial de ${fullName(patient)}`,
        entidad: { tipo: 'movimiento', id: movement.id },
        undo: {
          movimiento: movement,
          paciente: previousPatient,
          cama: bedBeforeDelete,
          urgencia: urgencyBeforeDelete,
          posicion: originalPosition
        }
      });
      return { eliminado: true, movimiento: enrichMovement(state, movement) };
    });
  }
}

function validateArea(value, field) {
  const area = canonicalArea(value);
  if (!area) throw new ValidationError('El área indicada no existe', { campo: field, permitidos: AREAS });
  return area;
}

function normalizeMovementStatus(value) {
  const status = removeDiacritics(value).trim().toLowerCase();
  if (!includes(ESTADOS_MOVIMIENTO, status)) {
    throw new ValidationError('Estado de traslado no válido', { campo: 'estado', permitidos: ESTADOS_MOVIMIENTO });
  }
  return status;
}

function enrichMovement(state, movement) {
  const patient = requirePatient(state, movement.pacienteId);
  const result = publicMovement(movement);
  result.historiaClinica = patient.historiaClinica;
  result.nombrePaciente = fullName(patient);
  return result;
}

function applyDestination(patient, destination) {
  patient.areaActual = destination;
  if (destination === 'Salida') patient.estado = 'Alta';
  else if (destination === 'UCI' || destination === 'Hospitalización') patient.estado = 'Hospitalizado';
  else patient.estado = 'En atención';
}

function releaseBedIfLeaving(state, patient, destination) {
  const bed = findPatientBed(state, patient.id);
  if (!bed || bed.area === destination) return null;
  const snapshot = clone(bed);
  bed.ocupada = false;
  bed.pacienteId = null;
  return snapshot;
}

function updateUrgencyForDestination(state, patientId, destination) {
  if (destination === 'Urgencias') return null;
  const urgencyIndex = findUrgencyIndex(state, patientId, true);
  if (urgencyIndex === -1) return null;
  const snapshot = clone(state.urgencias[urgencyIndex]);
  state.urgencias[urgencyIndex].estado = destination === 'Salida' ? 'cancelado' : 'atencion';
  state.urgencias[urgencyIndex].llamadoEn = state.urgencias[urgencyIndex].llamadoEn || new Date().toISOString();
  return snapshot;
}

function findMovementContext(state, movement) {
  if (movement.contextoAnterior) return clone(movement.contextoAnterior);
  for (let index = state.acciones.length - 1; index >= 0; index -= 1) {
    const undo = state.acciones[index].undo || {};
    if (undo.movimientoId === movement.id) {
      return {
        paciente: clone(undo.paciente),
        cama: clone(undo.cama),
        urgencia: clone(undo.urgencia)
      };
    }
  }
  return { paciente: null, cama: null, urgencia: null };
}

function restoreBedForMovementDelete(state, snapshot) {
  const index = findBedIndex(state, snapshot.id);
  if (index === -1) throw new NotFoundError(`No existe la cama ${snapshot.id}`);
  const current = state.camas[index];
  if (snapshot.ocupada && current.ocupada && current.pacienteId !== snapshot.pacienteId) {
    throw new ConflictError(`La cama ${current.codigo} está ocupada por otro paciente`);
  }
  state.camas[index] = clone(snapshot);
}

function restoreUrgencyForMovementDelete(state, snapshot) {
  const index = linearSearch(state.urgencias, String(snapshot.id), 'id');
  if (index === -1) state.urgencias.push(clone(snapshot));
  else state.urgencias[index] = clone(snapshot);
}

function currentUrgencySnapshot(state, urgencyId) {
  const index = linearSearch(state.urgencias, String(urgencyId), 'id');
  return index === -1 ? null : clone(state.urgencias[index]);
}

function isLatestCompletedMovement(state, movement) {
  let latest = null;
  let latestOrder = -Infinity;
  for (let index = 0; index < state.movimientos.length; index += 1) {
    const candidate = state.movimientos[index];
    if (candidate.pacienteId !== movement.pacienteId || candidate.estado !== 'completado') continue;
    const storedOrder = Number(candidate.ordenAplicacion);
    const applicationOrder = Number.isSafeInteger(storedOrder) ? storedOrder : index + 1;
    if (!latest || applicationOrder >= latestOrder) {
      latest = candidate;
      latestOrder = applicationOrder;
    }
  }
  return Boolean(latest && latest.id === movement.id);
}

function sortMovements(items, orderValue, directionValue) {
  const order = removeDiacritics(orderValue).trim().toLowerCase();
  const direction = removeDiacritics(directionValue).trim().toLowerCase();
  if (direction !== 'asc' && direction !== 'desc') {
    throw new ValidationError('La dirección de orden debe ser asc o desc', { campo: 'direccion' });
  }
  let comparator;
  if (order === 'fecha') comparator = (a, b) => new Date(a.fecha) - new Date(b.fecha);
  else if (order === 'paciente' || order === 'nombre') comparator = (a, b) => a.nombrePaciente.localeCompare(b.nombrePaciente, 'es');
  else if (order === 'area' || order === 'destino') comparator = (a, b) => a.areaDestino.localeCompare(b.areaDestino, 'es');
  else if (order === 'estado') comparator = (a, b) => a.estado.localeCompare(b.estado, 'es');
  else throw new ValidationError('Criterio de orden no válido', { campo: 'orden' });
  return insertionSort(items, direction === 'desc' ? (a, b) => -comparator(a, b) : comparator);
}

module.exports = MovimientosService;
module.exports.MovimientosService = MovimientosService;
module.exports.enrichMovement = enrichMovement;
