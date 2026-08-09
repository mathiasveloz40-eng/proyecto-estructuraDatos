'use strict';

const Queue = require('../structures/Queue');
const { insertionSort } = require('../algorithms/sorting');
const { linearSearchAll } = require('../algorithms/search');
const {
  PRIORIDADES,
  ESTADOS_URGENCIA,
  getPrioridad,
  removeDiacritics
} = require('../config/catalogs');
const { positiveInteger, isoDate, includes, clone } = require('../utils/value');
const { ValidationError, NotFoundError, ConflictError } = require('../utils/errors');
const {
  requirePatient,
  findPatientIndex,
  findUrgencyIndex,
  findPatientBed,
  nextSequence,
  insertMovement,
  recordAction,
  fullName
} = require('./domain.helpers');

class UrgenciasService {
  constructor(store) {
    this.store = store;
  }

  async list(query = {}) {
    const state = await this.store.read();
    let entries = state.urgencias.slice();
    if (query.estado && normalize(query.estado) !== 'todos') {
      const requestedStatus = normalizeUrgencyStatus(query.estado);
      entries = linearSearchAll(entries, (entry) => entry.estado === requestedStatus);
    } else if (!query.estado) {
      entries = linearSearchAll(entries, (entry) => entry.estado === 'espera' || entry.estado === 'llamado');
    }

    if (query.prioridad !== undefined && query.prioridad !== '') {
      const priority = validatePriority(query.prioridad);
      entries = linearSearchAll(entries, (entry) => entry.prioridad === priority);
    }

    let items = [];
    for (let index = 0; index < entries.length; index += 1) {
      const patient = requirePatient(state, entries[index].pacienteId);
      items.push(enrichUrgency(entries[index], patient));
    }
    items = sortUrgencies(items, query.orden || 'prioridad', query.direccion || 'asc');

    const summary = [];
    for (let priorityIndex = 0; priorityIndex < PRIORIDADES.length; priorityIndex += 1) {
      const priority = PRIORIDADES[priorityIndex];
      let quantity = 0;
      for (let entryIndex = 0; entryIndex < state.urgencias.length; entryIndex += 1) {
        const entry = state.urgencias[entryIndex];
        if (entry.estado === 'espera' && entry.prioridad === priority.nivel) quantity += 1;
      }
      summary.push({ nivel: priority.nivel, nombre: priority.nombre, cantidad: quantity });
    }
    let waitingTotal = 0;
    for (let index = 0; index < summary.length; index += 1) waitingTotal += summary[index].cantidad;

    return { pacientes: items, total: waitingTotal, resumenPorPrioridad: summary };
  }

  async enter(payload = {}) {
    const patientId = positiveInteger(payload.pacienteId, 'pacienteId');
    const priority = validatePriority(payload.prioridad);
    const arrivalTime = isoDate(payload.horaLlegada, 'horaLlegada');
    if (new Date(arrivalTime).getTime() > Date.now() + 60_000) {
      throw new ValidationError('La hora de llegada no puede estar en el futuro', { campo: 'horaLlegada' });
    }

    return this.store.mutate((state) => {
      const patient = requirePatient(state, patientId);
      if (findUrgencyIndex(state, patientId, true) !== -1) {
        throw new ConflictError('El paciente ya tiene una atención activa en Urgencias');
      }
      if (patient.estado === 'Alta') {
        throw new ConflictError('Debe reabrir la ficha del paciente antes de ingresarlo a Urgencias');
      }

      const previousPatient = clone(patient);
      let previousBed = null;
      const occupiedBed = findPatientBed(state, patient.id);
      if (occupiedBed) {
        previousBed = clone(occupiedBed);
        occupiedBed.ocupada = false;
        occupiedBed.pacienteId = null;
      }
      const entry = {
        id: nextSequence(state, 'urgencia', 'URG', 4),
        pacienteId: patient.id,
        prioridad: priority,
        horaLlegada: arrivalTime,
        estado: 'espera',
        llamadoEn: null
      };
      state.urgencias.push(entry);
      patient.prioridad = priority;
      patient.estado = 'En espera';
      const originArea = patient.areaActual;
      patient.areaActual = 'Urgencias';
      const movement = insertMovement(state, {
        pacienteId: patient.id,
        areaOrigen: originArea,
        areaDestino: 'Urgencias',
        fecha: arrivalTime,
        descripcion: 'Ingreso a la lista de espera de Urgencias',
        estado: 'completado',
        contextoAnterior: { paciente: previousPatient, cama: previousBed, urgencia: null }
      });
      recordAction(state, {
        tipo: 'INGRESO_URGENCIAS',
        descripcion: `${fullName(patient)} ingresó a Urgencias con prioridad ${priority}`,
        entidad: { tipo: 'paciente', id: patient.id },
        undo: {
          urgenciaId: entry.id,
          paciente: previousPatient,
          movimientoId: movement.id,
          cama: previousBed
        }
      });
      return enrichUrgency(entry, patient);
    });
  }

  async callNext() {
    return this.store.mutate((state) => {
      const queues = buildPriorityQueues(state.urgencias);
      let selected = null;
      for (let level = 1; level <= PRIORIDADES.length; level += 1) {
        if (!queues[level].isEmpty()) {
          selected = queues[level].dequeue();
          break;
        }
      }
      if (!selected) throw new ConflictError('No hay pacientes esperando atención');

      const patient = requirePatient(state, selected.pacienteId);
      const previousPatient = clone(patient);
      const previousEntry = clone(selected);
      selected.estado = 'llamado';
      selected.llamadoEn = new Date().toISOString();
      patient.estado = 'Llamado';
      recordAction(state, {
        tipo: 'LLAMAR_URGENCIAS',
        descripcion: `${fullName(patient)} fue llamado para atención`,
        entidad: { tipo: 'paciente', id: patient.id },
        undo: { urgencia: previousEntry, paciente: previousPatient }
      });
      return { paciente: clone(patient), ingreso: enrichUrgency(selected, patient) };
    });
  }

  async update(patientIdValue, payload = {}) {
    const patientId = positiveInteger(patientIdValue, 'pacienteId');
    if (payload.prioridad === undefined && payload.estado === undefined) {
      throw new ValidationError('Debe enviar prioridad o estado para actualizar');
    }
    return this.store.mutate((state) => {
      const urgencyIndex = findUrgencyIndex(state, patientId, true);
      if (urgencyIndex === -1) throw new NotFoundError('El paciente no tiene una atención activa en Urgencias');
      const entry = state.urgencias[urgencyIndex];
      const patientIndex = findPatientIndex(state, patientId);
      if (patientIndex === -1) throw new NotFoundError(`No existe el paciente ${patientId}`);
      const patient = state.pacientes[patientIndex];
      const previousEntry = clone(entry);
      const previousPatient = clone(patient);

      if (payload.prioridad !== undefined) {
        entry.prioridad = validatePriority(payload.prioridad);
        patient.prioridad = entry.prioridad;
      }
      if (payload.estado !== undefined) {
        const nextStatus = normalizeUrgencyStatus(payload.estado);
        const occupiedBed = findPatientBed(state, patient.id);
        if (occupiedBed && nextStatus !== 'atencion') {
          throw new ConflictError(`Debe liberar la cama ${occupiedBed.codigo} antes de cambiar ese estado`);
        }
        entry.estado = nextStatus;
        if (entry.estado === 'llamado') {
          entry.llamadoEn = entry.llamadoEn || new Date().toISOString();
          patient.estado = 'Llamado';
        } else if (entry.estado === 'atencion') {
          entry.llamadoEn = entry.llamadoEn || new Date().toISOString();
          patient.estado = 'En atención';
        } else if (entry.estado === 'espera') {
          entry.llamadoEn = null;
          patient.estado = 'En espera';
        } else if (entry.estado === 'cancelado') {
          patient.estado = 'Registrado';
        }
      }

      recordAction(state, {
        tipo: 'ACTUALIZAR_URGENCIA',
        descripcion: `La atención de ${fullName(patient)} fue actualizada`,
        entidad: { tipo: 'paciente', id: patient.id },
        undo: { urgencia: previousEntry, paciente: previousPatient }
      });
      return enrichUrgency(entry, patient);
    });
  }

  async remove(patientIdValue) {
    const patientId = positiveInteger(patientIdValue, 'pacienteId');
    return this.store.mutate((state) => {
      const urgencyIndex = findUrgencyIndex(state, patientId, true);
      if (urgencyIndex === -1) throw new NotFoundError('El paciente no tiene una atención activa en Urgencias');
      const entry = clone(state.urgencias[urgencyIndex]);
      const patient = requirePatient(state, patientId);
      const occupiedBed = findPatientBed(state, patient.id);
      if (occupiedBed) {
        throw new ConflictError(`Debe liberar la cama ${occupiedBed.codigo} antes de retirar al paciente de Urgencias`);
      }
      const previousPatient = clone(patient);
      state.urgencias.splice(urgencyIndex, 1);
      if (patient.estado === 'En espera' || patient.estado === 'Llamado') patient.estado = 'Registrado';

      recordAction(state, {
        tipo: 'CANCELAR_URGENCIA',
        descripcion: `${fullName(patient)} fue retirado de la lista de Urgencias`,
        entidad: { tipo: 'paciente', id: patient.id },
        undo: { urgencia: entry, paciente: previousPatient }
      });
      return { eliminado: true, ingreso: enrichUrgency(entry, previousPatient) };
    });
  }
}

function buildPriorityQueues(entries) {
  const queues = {};
  for (let level = 1; level <= PRIORIDADES.length; level += 1) queues[level] = new Queue();
  const waiting = linearSearchAll(entries, (entry) => entry.estado === 'espera');
  const chronological = insertionSort(waiting, (a, b) => (
    new Date(a.horaLlegada).getTime() - new Date(b.horaLlegada).getTime()
  ));
  for (let index = 0; index < chronological.length; index += 1) {
    queues[chronological[index].prioridad].enqueue(chronological[index]);
  }
  return queues;
}

function enrichUrgency(entry, patient) {
  const priority = getPrioridad(entry.prioridad);
  return {
    id: entry.id,
    pacienteId: patient.id,
    historiaClinica: patient.historiaClinica,
    nombre: fullName(patient),
    nombres: patient.nombres,
    apellidos: patient.apellidos,
    prioridad: entry.prioridad,
    prioridadNombre: priority.nombre,
    prioridadColor: priority.color,
    horaLlegada: entry.horaLlegada,
    tiempoEsperaMin: waitingMinutes(entry),
    estado: displayUrgencyStatus(entry.estado),
    estadoCodigo: entry.estado,
    areaActual: patient.areaActual,
    llamadoEn: entry.llamadoEn || null
  };
}

function waitingMinutes(entry) {
  const end = entry.llamadoEn ? new Date(entry.llamadoEn).getTime() : Date.now();
  return Math.max(0, Math.floor((end - new Date(entry.horaLlegada).getTime()) / 60_000));
}

function validatePriority(value) {
  const priority = positiveInteger(value, 'prioridad');
  if (!getPrioridad(priority)) throw new ValidationError('La prioridad debe estar entre 1 y 5', { campo: 'prioridad' });
  return priority;
}

function normalize(value) {
  return removeDiacritics(value).trim().toLowerCase();
}

function normalizeUrgencyStatus(value) {
  let normalized = normalize(value);
  if (normalized === 'en espera') normalized = 'espera';
  if (normalized === 'en atencion') normalized = 'atencion';
  if (normalized === 'cancelada') normalized = 'cancelado';
  if (!includes(ESTADOS_URGENCIA, normalized)) {
    throw new ValidationError('Estado de Urgencias no válido', { campo: 'estado', permitidos: ESTADOS_URGENCIA });
  }
  return normalized;
}

function displayUrgencyStatus(status) {
  if (status === 'espera') return 'En espera';
  if (status === 'llamado') return 'Llamado';
  if (status === 'atencion') return 'En atención';
  if (status === 'cancelado') return 'Cancelado';
  return status;
}

function sortUrgencies(items, orderValue, directionValue) {
  const order = normalize(orderValue);
  const direction = normalize(directionValue);
  if (direction !== 'asc' && direction !== 'desc') {
    throw new ValidationError('La dirección de orden debe ser asc o desc', { campo: 'direccion' });
  }
  let comparator;
  if (order === 'prioridad') {
    comparator = (a, b) => a.prioridad - b.prioridad || new Date(a.horaLlegada) - new Date(b.horaLlegada);
  } else if (order === 'espera' || order === 'tiempo') {
    comparator = (a, b) => a.tiempoEsperaMin - b.tiempoEsperaMin;
  } else if (order === 'nombre') {
    comparator = (a, b) => normalize(a.nombre).localeCompare(normalize(b.nombre), 'es');
  } else if (order === 'llegada' || order === 'horallegada') {
    comparator = (a, b) => new Date(a.horaLlegada) - new Date(b.horaLlegada);
  } else {
    throw new ValidationError('Criterio de orden no válido', {
      campo: 'orden', permitidos: ['prioridad', 'espera', 'nombre', 'llegada']
    });
  }
  return insertionSort(items, direction === 'desc' ? (a, b) => -comparator(a, b) : comparator);
}

module.exports = UrgenciasService;
module.exports.UrgenciasService = UrgenciasService;
module.exports.buildPriorityQueues = buildPriorityQueues;
module.exports.enrichUrgency = enrichUrgency;
module.exports.waitingMinutes = waitingMinutes;
