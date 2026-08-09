'use strict';

const Stack = require('../structures/Stack');
const { insertionSort } = require('../algorithms/sorting');
const { linearSearch, linearSearchValue } = require('../algorithms/search');
const { positiveInteger, clone } = require('../utils/value');
const { ConflictError, NotFoundError } = require('../utils/errors');
const {
  findPatientIndex,
  findBedIndex,
  findUrgencyIndex,
  removeMovement,
  restoreMovement,
  replacePatient,
  publicAction,
  recordAction
} = require('./domain.helpers');

class ActividadService {
  constructor(store) {
    this.store = store;
  }

  async list(query = {}) {
    const state = await this.store.read();
    const requestedLimit = query.limite === undefined ? 20 : positiveInteger(query.limite, 'limite');
    const limit = Math.min(requestedLimit, 100);
    const stack = new Stack(state.acciones);
    const nextUndo = stack.peek();
    const ordered = insertionSort(state.actividad, (a, b) => new Date(b.fecha) - new Date(a.fecha));
    const items = [];
    for (let index = 0; index < ordered.length && index < limit; index += 1) {
      items.push({
        ...clone(ordered[index]),
        deshacerDisponible: Boolean(nextUndo && nextUndo.id === ordered[index].id)
      });
    }
    return {
      acciones: items,
      total: state.actividad.length,
      puedeDeshacer: !stack.isEmpty(),
      siguienteDeshacer: publicAction(nextUndo)
    };
  }

  async undo() {
    return this.store.mutate((state) => {
      const stack = new Stack(state.acciones);
      if (stack.isEmpty()) throw new ConflictError('No hay acciones recientes que se puedan deshacer');
      const action = stack.pop();
      const result = applyUndo(state, action);
      state.acciones = stack.toArray();
      recordAction(state, {
        tipo: 'DESHACER',
        descripcion: `Se deshizo: ${action.descripcion}`,
        entidad: action.entidad
      }, false);
      return { accion: publicAction(action), resultado: result };
    });
  }
}

function applyUndo(state, action) {
  const undo = action.undo || {};
  switch (action.tipo) {
    case 'CREAR_PACIENTE':
      return undoCreatePatient(state, undo);
    case 'ACTUALIZAR_PACIENTE':
      if (undo.cama) {
        assertBedCanBeRestored(state, undo.cama);
        restoreBed(state, undo.cama);
      }
      if (undo.urgencia) restoreUrgency(state, undo.urgencia);
      restorePatientAndRemoveMovement(state, undo);
      return { mensaje: 'La ficha anterior fue restaurada', pacienteId: undo.paciente.id };
    case 'ELIMINAR_PACIENTE':
      return undoDeletePatient(state, undo);
    case 'INGRESO_URGENCIAS':
      removeUrgencyById(state, undo.urgenciaId);
      if (undo.cama) {
        assertBedCanBeRestored(state, undo.cama);
        restoreBed(state, undo.cama);
      }
      restorePatientAndRemoveMovement(state, undo);
      return { mensaje: 'El ingreso a Urgencias fue revertido', pacienteId: undo.paciente.id };
    case 'LLAMAR_URGENCIAS':
    case 'ACTUALIZAR_URGENCIA':
      restoreUrgency(state, undo.urgencia);
      replacePatient(state, undo.paciente);
      return { mensaje: 'El estado de atención anterior fue restaurado', pacienteId: undo.paciente.id };
    case 'CANCELAR_URGENCIA':
      restoreUrgency(state, undo.urgencia);
      replacePatient(state, undo.paciente);
      return { mensaje: 'El paciente regresó a la lista de Urgencias', pacienteId: undo.paciente.id };
    case 'ASIGNAR_CAMA':
      restoreBed(state, undo.cama);
      replacePatient(state, undo.paciente);
      if (undo.urgencia) restoreUrgency(state, undo.urgencia);
      removeMovement(state, undo.paciente.id, undo.movimientoId);
      return { mensaje: 'La asignación de cama fue revertida', pacienteId: undo.paciente.id };
    case 'LIBERAR_CAMA':
      assertBedCanBeRestored(state, undo.cama);
      restoreBed(state, undo.cama);
      replacePatient(state, undo.paciente);
      removeMovement(state, undo.paciente.id, undo.movimientoId);
      return { mensaje: 'La ocupación de la cama fue restaurada', pacienteId: undo.paciente.id };
    case 'CAMBIO_AREA':
      if (undo.cama) {
        assertBedCanBeRestored(state, undo.cama);
        restoreBed(state, undo.cama);
      }
      if (undo.urgencia) restoreUrgency(state, undo.urgencia);
      restorePatientAndRemoveMovement(state, undo);
      return { mensaje: 'El área anterior fue restaurada', pacienteId: undo.paciente.id };
    case 'CREAR_TRASLADO':
      if (!removeMovement(state, action.entidad && action.entidad.id ? findMovementPatient(state, action.entidad.id) : undo.paciente.id, undo.movimientoId)) {
        throw new ConflictError('El traslado pendiente ya no existe');
      }
      return { mensaje: 'La solicitud de traslado fue eliminada', movimientoId: undo.movimientoId };
    case 'ACTUALIZAR_MOVIMIENTO':
      restoreMovement(state, undo.movimiento);
      replacePatient(state, undo.paciente);
      if (undo.urgencia) restoreUrgency(state, undo.urgencia);
      if (undo.cama) {
        assertBedCanBeRestored(state, undo.cama);
        restoreBed(state, undo.cama);
      }
      return { mensaje: 'El evento anterior fue restaurado', movimientoId: undo.movimiento.id };
    case 'ELIMINAR_MOVIMIENTO':
      restoreMovement(state, undo.movimiento, undo.posicion);
      replacePatient(state, undo.paciente);
      if (undo.cama) restoreBed(state, undo.cama);
      if (undo.urgencia) restoreUrgency(state, undo.urgencia);
      return { mensaje: 'El evento regresó al historial', movimientoId: undo.movimiento.id };
    default:
      throw new ConflictError(`La acción ${action.tipo} no es compatible con deshacer`);
  }
}

function undoCreatePatient(state, undo) {
  const patientIndex = findPatientIndex(state, undo.pacienteId);
  if (patientIndex === -1) throw new ConflictError('El paciente creado ya no existe');
  const references = hasPatientReferences(state, undo.pacienteId, undo.movimientoId);
  if (references) throw new ConflictError('No se puede deshacer el registro porque el paciente ya tiene actividad posterior');
  state.pacientes.splice(patientIndex, 1);
  removeMovement(state, undo.pacienteId, undo.movimientoId);
  return { mensaje: 'El registro del paciente fue retirado', pacienteId: undo.pacienteId };
}

function undoDeletePatient(state, undo) {
  if (findPatientIndex(state, undo.paciente.id) !== -1) throw new ConflictError('Ya existe nuevamente ese paciente');
  state.pacientes.push(clone(undo.paciente));
  for (let index = 0; index < undo.urgencias.length; index += 1) restoreUrgency(state, undo.urgencias[index]);
  for (let index = 0; index < undo.movimientos.length; index += 1) restoreMovement(state, undo.movimientos[index]);
  for (let index = 0; index < undo.camas.length; index += 1) {
    assertBedCanBeRestored(state, undo.camas[index]);
    restoreBed(state, undo.camas[index]);
  }
  return { mensaje: 'El paciente y sus relaciones fueron restaurados', pacienteId: undo.paciente.id };
}

function restorePatientAndRemoveMovement(state, undo) {
  replacePatient(state, undo.paciente);
  if (undo.movimientoId) removeMovement(state, undo.paciente.id, undo.movimientoId);
}

function restoreUrgency(state, urgency) {
  if (!urgency) return;
  const index = linearSearch(state.urgencias, String(urgency.id), 'id');
  if (index === -1) state.urgencias.push(clone(urgency));
  else state.urgencias[index] = clone(urgency);
}

function removeUrgencyById(state, urgencyId) {
  const index = linearSearch(state.urgencias, String(urgencyId), 'id');
  if (index === -1) throw new ConflictError('El ingreso a Urgencias ya no existe');
  state.urgencias.splice(index, 1);
}

function restoreBed(state, bedSnapshot) {
  if (!bedSnapshot) return;
  const index = findBedIndex(state, bedSnapshot.id);
  if (index === -1) throw new NotFoundError(`No existe la cama ${bedSnapshot.id}`);
  state.camas[index] = clone(bedSnapshot);
}

function assertBedCanBeRestored(state, bedSnapshot) {
  const index = findBedIndex(state, bedSnapshot.id);
  if (index === -1) throw new NotFoundError(`No existe la cama ${bedSnapshot.id}`);
  const current = state.camas[index];
  if (bedSnapshot.ocupada && current.ocupada && current.pacienteId !== bedSnapshot.pacienteId) {
    throw new ConflictError(`La cama ${current.codigo} ahora está ocupada por otro paciente`);
  }
}

function hasPatientReferences(state, patientId, allowedMovementId) {
  if (findUrgencyIndex(state, patientId, false) !== -1) return true;
  for (let index = 0; index < state.camas.length; index += 1) {
    if (state.camas[index].pacienteId === patientId) return true;
  }
  for (let index = 0; index < state.movimientos.length; index += 1) {
    if (state.movimientos[index].pacienteId === patientId && state.movimientos[index].id !== allowedMovementId) return true;
  }
  return false;
}

function findMovementPatient(state, movementId) {
  const movement = linearSearchValue(state.movimientos, String(movementId), 'id');
  if (!movement) throw new ConflictError('El traslado pendiente ya no existe');
  return movement.pacienteId;
}

module.exports = ActividadService;
module.exports.ActividadService = ActividadService;
