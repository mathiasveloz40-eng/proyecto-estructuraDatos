'use strict';

const { linearSearch, linearSearchAll, treeSearch } = require('../algorithms/search');
const { insertionSort } = require('../algorithms/sorting');
const {
  AREAS,
  PRIORIDADES,
  ESTADOS_PACIENTE,
  SEXOS,
  canonicalArea,
  removeDiacritics
} = require('../config/catalogs');
const {
  requiredText,
  optionalText,
  positiveInteger,
  isoDate,
  includes,
  clone
} = require('../utils/value');
const { ValidationError, NotFoundError, ConflictError } = require('../utils/errors');
const {
  buildPatientTree,
  findPatientIndex,
  findPatientBed,
  findUrgencyIndex,
  buildPatientHistory,
  insertMovement,
  removeMovement,
  recordAction,
  publicMovement,
  fullName
} = require('./domain.helpers');

class PacientesService {
  constructor(store) {
    this.store = store;
  }

  async list(query = {}) {
    const state = await this.store.read();
    let patients = state.pacientes.slice();

    if (query.buscar) {
      const searchTerm = normalizeForSearch(query.buscar);
      patients = linearSearchAll(patients, (patient) => {
        const combined = normalizeForSearch(
          `${patient.nombres} ${patient.apellidos} ${patient.cedula} ${patient.historiaClinica}`
        );
        return combined.includes(searchTerm);
      });
    }

    if (query.area) {
      const area = canonicalArea(query.area);
      if (!area) throw new ValidationError('El área indicada no existe', { campo: 'area' });
      patients = linearSearchAll(patients, (patient) => patient.areaActual === area);
    }

    if (query.estado) {
      const normalizedStatus = normalizeForSearch(query.estado);
      patients = linearSearchAll(patients, (patient) => normalizeForSearch(patient.estado) === normalizedStatus);
    }

    if (query.prioridad !== undefined && query.prioridad !== '') {
      const priority = positiveInteger(query.prioridad, 'prioridad');
      if (priority > 5) throw new ValidationError('La prioridad debe estar entre 1 y 5');
      patients = linearSearchAll(patients, (patient) => patient.prioridad === priority);
    }

    const comparator = patientComparator(query.orden || 'nombre');
    const direction = String(query.direccion || 'asc').toLowerCase();
    if (direction !== 'asc' && direction !== 'desc') {
      throw new ValidationError('La dirección de orden debe ser asc o desc', { campo: 'direccion' });
    }
    patients = insertionSort(patients, direction === 'desc' ? (a, b) => -comparator(a, b) : comparator);
    return patients;
  }

  async get(id) {
    const state = await this.store.read();
    const patient = treeSearch(buildPatientTree(state.pacientes, 'id'), positiveInteger(id, 'id'));
    if (!patient) throw new NotFoundError(`No existe el paciente ${id}`);
    return enrichPatient(state, patient);
  }

  async searchByHistory(historyNumber) {
    const state = await this.store.read();
    const key = positiveInteger(historyNumber, 'historiaClinica');
    const patient = treeSearch(buildPatientTree(state.pacientes, 'historiaClinica'), key);
    if (!patient) throw new NotFoundError(`No existe la historia clínica ${key}`);
    return enrichPatient(state, patient);
  }

  async create(payload = {}) {
    return this.store.mutate((state) => {
      const patient = validatePatient(payload, null);
      if (patient.estado === 'En espera' || patient.estado === 'Llamado') {
        throw new ValidationError('Para iniciar la espera utilice el ingreso de Urgencias', {
          campo: 'estado', endpoint: 'POST /api/urgencias'
        });
      }
      assertPatientUniqueness(state, patient);
      state.pacientes.push(patient);

      const movement = insertMovement(state, {
        pacienteId: patient.id,
        areaOrigen: null,
        areaDestino: patient.areaActual,
        fecha: patient.fechaIngreso,
        descripcion: 'Ingreso y registro administrativo',
        estado: 'completado'
      });
      recordAction(state, {
        tipo: 'CREAR_PACIENTE',
        descripcion: `${fullName(patient)} fue registrado en el sistema`,
        entidad: { tipo: 'paciente', id: patient.id },
        undo: { pacienteId: patient.id, movimientoId: movement.id }
      });
      return enrichPatient(state, patient);
    });
  }

  async update(id, payload = {}) {
    const patientId = positiveInteger(id, 'id');
    return this.store.mutate((state) => {
      const index = findPatientIndex(state, patientId);
      if (index === -1) throw new NotFoundError(`No existe el paciente ${patientId}`);
      if (payload.id !== undefined && Number(payload.id) !== patientId) {
        throw new ValidationError('El identificador del paciente no se puede modificar', { campo: 'id' });
      }

      const previous = clone(state.pacientes[index]);
      const patient = validatePatient({ ...previous, ...payload, id: patientId }, previous);
      if (patient.areaActual !== previous.areaActual) {
        if (patient.areaActual === 'Salida') patient.estado = 'Alta';
        else if (patient.areaActual === 'UCI' || patient.areaActual === 'Hospitalización') patient.estado = 'Hospitalizado';
        else if (patient.areaActual !== 'Urgencias' || (patient.estado !== 'En espera' && patient.estado !== 'Llamado')) {
          patient.estado = 'En atención';
        }
      }
      if ((patient.estado === 'En espera' || patient.estado === 'Llamado') && patient.areaActual !== 'Urgencias') {
        throw new ValidationError(`${patient.estado} solo es compatible con el área de Urgencias`, {
          campos: ['estado', 'areaActual']
        });
      }
      assertPatientUniqueness(state, patient, patientId);
      state.pacientes[index] = patient;

      let bedSnapshot = null;
      const patientBed = findPatientBed(state, patient.id);
      if (patientBed && patientBed.area === patient.areaActual) {
        const requiredStatus = patientBed.area === 'Urgencias' ? 'En atención' : 'Hospitalizado';
        if (patient.estado !== requiredStatus) {
          throw new ConflictError(`El paciente debe permanecer como ${requiredStatus} mientras ocupe la cama ${patientBed.codigo}`);
        }
      }
      if (patientBed && patientBed.area !== patient.areaActual) {
        bedSnapshot = clone(patientBed);
        patientBed.ocupada = false;
        patientBed.pacienteId = null;
      }
      let urgencySnapshot = null;
      const urgencyIndex = findUrgencyIndex(state, patient.id, true);
      if (urgencyIndex !== -1) {
        urgencySnapshot = clone(state.urgencias[urgencyIndex]);
        state.urgencias[urgencyIndex].prioridad = patient.prioridad;
        if (patient.areaActual !== 'Urgencias') {
          state.urgencias[urgencyIndex].estado = patient.estado === 'Alta' ? 'cancelado' : 'atencion';
          state.urgencias[urgencyIndex].llamadoEn = state.urgencias[urgencyIndex].llamadoEn || new Date().toISOString();
        } else if (patient.estado === 'En espera') {
          state.urgencias[urgencyIndex].estado = 'espera';
        } else if (patient.estado === 'Llamado') {
          state.urgencias[urgencyIndex].estado = 'llamado';
          state.urgencias[urgencyIndex].llamadoEn = state.urgencias[urgencyIndex].llamadoEn || new Date().toISOString();
        } else if (patient.estado === 'En atención' || patient.estado === 'Hospitalizado') {
          state.urgencias[urgencyIndex].estado = 'atencion';
          state.urgencias[urgencyIndex].llamadoEn = state.urgencias[urgencyIndex].llamadoEn || new Date().toISOString();
        } else if (patient.estado === 'Registrado' || patient.estado === 'Alta') {
          state.urgencias[urgencyIndex].estado = 'cancelado';
          state.urgencias[urgencyIndex].llamadoEn = state.urgencias[urgencyIndex].llamadoEn || new Date().toISOString();
        }
      } else if (patient.estado === 'En espera' || patient.estado === 'Llamado') {
        throw new ConflictError('El paciente no tiene un ingreso activo; utilice el módulo de Urgencias');
      }

      let movement = null;
      if (patient.areaActual !== previous.areaActual) {
        movement = insertMovement(state, {
          pacienteId: patient.id,
          areaOrigen: previous.areaActual,
          areaDestino: patient.areaActual,
          descripcion: optionalText(payload.descripcionMovimiento, 'descripcionMovimiento')
            || `Cambio de área a ${patient.areaActual}`,
          estado: 'completado',
          contextoAnterior: {
            paciente: previous,
            cama: bedSnapshot,
            urgencia: urgencySnapshot
          }
        });
      }

      recordAction(state, {
        tipo: 'ACTUALIZAR_PACIENTE',
        descripcion: `La ficha de ${fullName(patient)} fue actualizada`,
        entidad: { tipo: 'paciente', id: patient.id },
        undo: {
          paciente: previous,
          movimientoId: movement ? movement.id : null,
          cama: bedSnapshot,
          urgencia: urgencySnapshot
        }
      });
      return enrichPatient(state, patient);
    });
  }

  async remove(id) {
    const patientId = positiveInteger(id, 'id');
    return this.store.mutate((state) => {
      const index = findPatientIndex(state, patientId);
      if (index === -1) throw new NotFoundError(`No existe el paciente ${patientId}`);
      const patient = clone(state.pacientes[index]);
      const urgencies = [];
      const movements = [];
      const beds = [];

      for (let urgencyIndex = state.urgencias.length - 1; urgencyIndex >= 0; urgencyIndex -= 1) {
        if (state.urgencias[urgencyIndex].pacienteId === patientId) {
          urgencies.unshift(state.urgencias[urgencyIndex]);
          state.urgencias.splice(urgencyIndex, 1);
        }
      }
      for (let movementIndex = state.movimientos.length - 1; movementIndex >= 0; movementIndex -= 1) {
        if (state.movimientos[movementIndex].pacienteId === patientId) {
          movements.unshift(state.movimientos[movementIndex]);
          state.movimientos.splice(movementIndex, 1);
        }
      }
      for (let bedIndex = 0; bedIndex < state.camas.length; bedIndex += 1) {
        if (state.camas[bedIndex].pacienteId === patientId) {
          beds.push(clone(state.camas[bedIndex]));
          state.camas[bedIndex].ocupada = false;
          state.camas[bedIndex].pacienteId = null;
        }
      }
      state.pacientes.splice(index, 1);

      recordAction(state, {
        tipo: 'ELIMINAR_PACIENTE',
        descripcion: `El registro de ${fullName(patient)} fue eliminado`,
        entidad: { tipo: 'paciente', id: patient.id },
        undo: { paciente: patient, urgencias: urgencies, movimientos: movements, camas: beds }
      });
      return { eliminado: true, paciente: patient };
    });
  }

  async history(id) {
    const state = await this.store.read();
    const patientId = positiveInteger(id, 'id');
    const patientIndex = findPatientIndex(state, patientId);
    if (patientIndex === -1) throw new NotFoundError(`No existe el paciente ${patientId}`);
    const history = buildPatientHistory(state, patientId).recorrer();
    return history.map((movement) => publicMovement(movement));
  }
}

function validatePatient(payload, previous) {
  const historiaClinica = positiveInteger(payload.historiaClinica ?? payload.id, 'historiaClinica');
  const id = previous ? previous.id : positiveInteger(payload.id ?? historiaClinica, 'id');
  let areaActual = canonicalArea(payload.areaActual || (previous && previous.areaActual) || 'Triaje');
  if (!areaActual) throw new ValidationError('El área actual no pertenece al catálogo', { campo: 'areaActual', permitidos: AREAS });

  const prioridad = positiveInteger(payload.prioridad ?? (previous && previous.prioridad) ?? 5, 'prioridad');
  if (prioridad < 1 || prioridad > PRIORIDADES.length) {
    throw new ValidationError('La prioridad debe estar entre 1 y 5', { campo: 'prioridad' });
  }

  const sexo = requiredText(payload.sexo || 'No especificado', 'sexo', 30);
  if (!includes(SEXOS, sexo)) throw new ValidationError('El sexo seleccionado no pertenece al catálogo', { campo: 'sexo' });
  let estado = requiredText(payload.estado || 'Registrado', 'estado', 30);
  if (!includes(ESTADOS_PACIENTE, estado)) throw new ValidationError('El estado seleccionado no pertenece al catálogo', { campo: 'estado' });
  if (areaActual === 'Salida') estado = 'Alta';
  if (estado === 'Alta') areaActual = 'Salida';
  if (!previous && (estado === 'En espera' || estado === 'Llamado') && areaActual !== 'Urgencias') {
    throw new ValidationError(`${estado} solo es compatible con el área de Urgencias`, {
      campos: ['estado', 'areaActual']
    });
  }

  const cedula = requiredText(payload.cedula, 'cedula', 15);
  if (!/^\d{10}$/.test(cedula)) {
    throw new ValidationError('La cédula debe contener 10 dígitos', { campo: 'cedula' });
  }
  const telefono = requiredText(payload.telefono, 'telefono', 25);
  if (!/^[+\d\s()\-]{7,25}$/.test(telefono)) {
    throw new ValidationError('El teléfono contiene un formato inválido', { campo: 'telefono' });
  }

  return {
    id,
    historiaClinica,
    nombres: requiredText(payload.nombres, 'nombres', 80),
    apellidos: requiredText(payload.apellidos, 'apellidos', 80),
    cedula,
    fechaNacimiento: isoDate(payload.fechaNacimiento, 'fechaNacimiento', { notFuture: true, dateOnly: true }),
    sexo,
    telefono,
    contactoEmergencia: requiredText(payload.contactoEmergencia, 'contactoEmergencia', 180),
    fechaIngreso: isoDate(payload.fechaIngreso || (previous && previous.fechaIngreso), 'fechaIngreso', { notFuture: true }),
    estado,
    areaActual,
    prioridad
  };
}

function assertPatientUniqueness(state, patient, ignoredId) {
  const idTree = buildPatientTree(state.pacientes, 'id');
  if (patient.id !== ignoredId && idTree.search(patient.id)) {
    throw new ConflictError(`Ya existe un paciente con id ${patient.id}`, { campo: 'id' });
  }
  const historyTree = buildPatientTree(state.pacientes, 'historiaClinica');
  const sameHistory = historyTree.search(patient.historiaClinica);
  if (sameHistory && sameHistory.id !== ignoredId) {
    throw new ConflictError(`Ya existe la historia clínica ${patient.historiaClinica}`, { campo: 'historiaClinica' });
  }
  const duplicateCedulaIndex = linearSearch(state.pacientes, (current) => (
    current.cedula === patient.cedula && current.id !== ignoredId
  ));
  if (duplicateCedulaIndex !== -1) {
    throw new ConflictError(`Ya existe un paciente con cédula ${patient.cedula}`, { campo: 'cedula' });
  }
}

function enrichPatient(state, patient) {
  const result = clone(patient);
  result.nombreCompleto = fullName(patient);
  result.historial = buildPatientHistory(state, patient.id).recorrer().map((movement) => publicMovement(movement));
  result.cama = clone(findPatientBed(state, patient.id));
  return result;
}

function normalizeForSearch(value) {
  return removeDiacritics(value).toLowerCase().trim();
}

function patientComparator(order) {
  const normalized = normalizeForSearch(order);
  if (normalized === 'nombre' || normalized === 'nombres' || normalized === 'apellido') {
    return (a, b) => normalizeForSearch(`${a.apellidos} ${a.nombres}`).localeCompare(normalizeForSearch(`${b.apellidos} ${b.nombres}`), 'es');
  }
  if (normalized === 'fechaingreso' || normalized === 'fecha') {
    return (a, b) => new Date(a.fechaIngreso).getTime() - new Date(b.fechaIngreso).getTime();
  }
  if (normalized === 'prioridad') return (a, b) => a.prioridad - b.prioridad;
  if (normalized === 'historiaclinica' || normalized === 'historia' || normalized === 'id') {
    return (a, b) => a.historiaClinica - b.historiaClinica;
  }
  throw new ValidationError('Criterio de orden no válido', {
    campo: 'orden', permitidos: ['nombre', 'fechaIngreso', 'prioridad', 'historiaClinica']
  });
}

module.exports = PacientesService;
module.exports.PacientesService = PacientesService;
