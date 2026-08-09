'use strict';

const BinarySearchTree = require('../structures/BinarySearchTree');
const ListaEnlazada = require('../structures/LinkedList');
const Stack = require('../structures/Stack');
const { linearSearch, linearSearchValue } = require('../algorithms/search');
const { clone } = require('../utils/value');
const { NotFoundError } = require('../utils/errors');

function buildPatientTree(patients, field = 'id') {
  const tree = new BinarySearchTree();
  for (let index = 0; index < patients.length; index += 1) {
    tree.insert(patients[index][field], patients[index]);
  }
  return tree;
}

function findPatient(state, id) {
  const numericId = Number(id);
  if (!Number.isFinite(numericId)) return null;
  return buildPatientTree(state.pacientes, 'id').search(numericId);
}

function requirePatient(state, id) {
  const patient = findPatient(state, id);
  if (!patient) throw new NotFoundError(`No existe el paciente ${id}`);
  return patient;
}

function findPatientIndex(state, id) {
  return linearSearch(state.pacientes, Number(id), 'id');
}

function findUrgencyIndex(state, patientId, activeOnly = false) {
  const numericId = Number(patientId);
  return linearSearch(state.urgencias, (entry) => (
    entry.pacienteId === numericId
    && (!activeOnly || entry.estado === 'espera' || entry.estado === 'llamado' || entry.estado === 'atencion')
  ));
}

function findBedIndex(state, identifier) {
  const numericId = Number(identifier);
  return linearSearch(state.camas, (bed) => (
    (Number.isFinite(numericId) && bed.id === numericId)
    || String(bed.codigo).toLowerCase() === String(identifier).trim().toLowerCase()
  ));
}

function findPatientBed(state, patientId) {
  return linearSearchValue(state.camas, (bed) => bed.ocupada && bed.pacienteId === Number(patientId));
}

function nextSequence(state, name, prefix, width) {
  state.config.sequences = state.config.sequences || {};
  const next = Number(state.config.sequences[name] || 0) + 1;
  state.config.sequences[name] = next;
  return `${prefix}-${String(next).padStart(width, '0')}`;
}

function fullName(patient) {
  return `${patient.nombres} ${patient.apellidos}`.trim();
}

function createMovement(state, data) {
  const movement = {
    id: nextSequence(state, 'movimiento', 'MOV', 5),
    pacienteId: Number(data.pacienteId),
    area: data.areaDestino,
    areaOrigen: data.areaOrigen || null,
    areaDestino: data.areaDestino,
    fecha: data.fecha || new Date().toISOString(),
    descripcion: data.descripcion,
    estado: data.estado || 'completado'
  };
  if (movement.estado === 'completado') markMovementApplied(state, movement);
  if (data.contextoAnterior) movement.contextoAnterior = clone(data.contextoAnterior);
  return movement;
}

function markMovementApplied(state, movement) {
  state.config.sequences = state.config.sequences || {};
  if (!Number.isSafeInteger(Number(state.config.sequences.aplicacionMovimiento))) {
    let maximum = 0;
    for (let index = 0; index < state.movimientos.length; index += 1) {
      const value = Number(state.movimientos[index].ordenAplicacion);
      if (Number.isSafeInteger(value) && value > maximum) maximum = value;
    }
    state.config.sequences.aplicacionMovimiento = Math.max(maximum, state.movimientos.length);
  }
  state.config.sequences.aplicacionMovimiento = Number(state.config.sequences.aplicacionMovimiento) + 1;
  movement.ordenAplicacion = state.config.sequences.aplicacionMovimiento;
  return movement.ordenAplicacion;
}

function buildPatientHistory(state, patientId) {
  const list = new ListaEnlazada();
  const numericId = Number(patientId);
  for (let index = 0; index < state.movimientos.length; index += 1) {
    if (state.movimientos[index].pacienteId === numericId) {
      list.insertar(state.movimientos[index]);
    }
  }
  return list;
}

function replacePatientHistory(state, patientId, historyList) {
  const numericId = Number(patientId);
  const others = [];
  for (let index = 0; index < state.movimientos.length; index += 1) {
    if (state.movimientos[index].pacienteId !== numericId) others.push(state.movimientos[index]);
  }
  const patientHistory = historyList.recorrer();
  for (let index = 0; index < patientHistory.length; index += 1) others.push(patientHistory[index]);
  state.movimientos = others;
}

function insertMovement(state, data) {
  const movement = createMovement(state, data);
  const history = buildPatientHistory(state, movement.pacienteId);
  history.insertar(movement);
  replacePatientHistory(state, movement.pacienteId, history);
  return movement;
}

function removeMovement(state, patientId, movementId) {
  const history = buildPatientHistory(state, patientId);
  const removed = history.eliminar(movementId);
  if (removed) replacePatientHistory(state, patientId, history);
  return removed;
}

function restoreMovement(state, movement, position) {
  const history = buildPatientHistory(state, movement.pacienteId);
  if (history.buscar(movement.id)) history.modificar(movement.id, () => clone(movement));
  else if (Number.isInteger(position) && position >= 0) {
    const values = history.recorrer();
    const rebuilt = new ListaEnlazada();
    const insertionPosition = Math.min(position, values.length);
    for (let index = 0; index <= values.length; index += 1) {
      if (index === insertionPosition) rebuilt.insertar(clone(movement));
      if (index < values.length) rebuilt.insertar(values[index]);
    }
    replacePatientHistory(state, movement.pacienteId, rebuilt);
    return;
  } else history.insertar(clone(movement));
  replacePatientHistory(state, movement.pacienteId, history);
}

function publicAction(action) {
  if (!action) return null;
  const result = clone(action);
  delete result.undo;
  return result;
}

function publicMovement(movement) {
  if (!movement) return null;
  const result = clone(movement);
  delete result.contextoAnterior;
  delete result.ordenAplicacion;
  return result;
}

function recordAction(state, specification, undoable = true) {
  const action = {
    id: nextSequence(state, 'accion', 'ACT', 6),
    tipo: specification.tipo,
    descripcion: specification.descripcion,
    fecha: specification.fecha || new Date().toISOString(),
    entidad: specification.entidad || null
  };
  if (undoable) action.undo = clone(specification.undo || {});

  if (undoable) {
    const stack = new Stack(state.acciones);
    stack.push(action);
    let stored = stack.toArray();
    const maximum = Number(state.config.maxAccionesDeshacer || 50);
    if (stored.length > maximum) stored = stored.slice(stored.length - maximum);
    state.acciones = stored;
  }

  state.actividad.unshift(publicAction(action));
  const activityMaximum = Number(state.config.maxActividad || 100);
  if (state.actividad.length > activityMaximum) state.actividad.length = activityMaximum;
  return action;
}

function replacePatient(state, snapshot) {
  const index = findPatientIndex(state, snapshot.id);
  if (index === -1) state.pacientes.push(clone(snapshot));
  else state.pacientes[index] = clone(snapshot);
  return state.pacientes[index === -1 ? state.pacientes.length - 1 : index];
}

module.exports = {
  buildPatientTree,
  findPatient,
  requirePatient,
  findPatientIndex,
  findUrgencyIndex,
  findBedIndex,
  findPatientBed,
  nextSequence,
  fullName,
  createMovement,
  markMovementApplied,
  buildPatientHistory,
  replacePatientHistory,
  insertMovement,
  removeMovement,
  restoreMovement,
  publicAction,
  publicMovement,
  recordAction,
  replacePatient
};
