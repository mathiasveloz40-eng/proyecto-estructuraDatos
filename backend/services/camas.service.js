'use strict';

const { insertionSort } = require('../algorithms/sorting');
const { linearSearchAll } = require('../algorithms/search');
const { AREAS, canonicalArea, removeDiacritics } = require('../config/catalogs');
const { booleanFromQuery, clone } = require('../utils/value');
const { ValidationError, NotFoundError, ConflictError } = require('../utils/errors');
const {
  requirePatient,
  findBedIndex,
  findPatientBed,
  findUrgencyIndex,
  insertMovement,
  recordAction,
  fullName
} = require('./domain.helpers');

class CamasService {
  constructor(store) {
    this.store = store;
  }

  async list(query = {}) {
    const state = await this.store.read();
    let beds = state.camas.slice();
    if (query.area) {
      const area = canonicalArea(query.area);
      if (!area) throw new ValidationError('El área indicada no existe', { campo: 'area', permitidos: AREAS });
      beds = linearSearchAll(beds, (bed) => bed.area === area);
    }
    const occupiedFilter = booleanFromQuery(query.ocupada);
    if (occupiedFilter !== undefined) beds = linearSearchAll(beds, (bed) => bed.ocupada === occupiedFilter);

    let enrichedBeds = [];
    for (let index = 0; index < beds.length; index += 1) {
      enrichedBeds.push(enrichBed(state, beds[index]));
    }
    enrichedBeds = insertionSort(enrichedBeds, (a, b) => a.codigo.localeCompare(b.codigo, 'es'));
    return { camas: enrichedBeds, resumen: summarizeBeds(state.camas, beds) };
  }

  async assign(payload = {}) {
    const identifier = getBedIdentifier(payload);
    const patientId = Number(payload.pacienteId);
    if (!Number.isSafeInteger(patientId) || patientId <= 0) {
      throw new ValidationError('El campo pacienteId debe ser un entero positivo', { campo: 'pacienteId' });
    }

    return this.store.mutate((state) => {
      const bedIndex = findBedIndex(state, identifier);
      if (bedIndex === -1) throw new NotFoundError(`No existe la cama ${identifier}`);
      const bed = state.camas[bedIndex];
      if (bed.ocupada) throw new ConflictError(`La cama ${bed.codigo} ya está ocupada`);
      const patient = requirePatient(state, patientId);
      const currentBed = findPatientBed(state, patient.id);
      if (currentBed) throw new ConflictError(`El paciente ya ocupa la cama ${currentBed.codigo}`);
      if (patient.estado === 'Alta') throw new ConflictError('No se puede asignar una cama a un paciente con alta');

      const previousBed = clone(bed);
      const previousPatient = clone(patient);
      let previousUrgency = null;
      const urgencyIndex = findUrgencyIndex(state, patient.id, true);
      if (urgencyIndex !== -1) {
        previousUrgency = clone(state.urgencias[urgencyIndex]);
        state.urgencias[urgencyIndex].estado = 'atencion';
        state.urgencias[urgencyIndex].llamadoEn = state.urgencias[urgencyIndex].llamadoEn || new Date().toISOString();
      }

      bed.ocupada = true;
      bed.pacienteId = patient.id;
      const originArea = patient.areaActual;
      patient.areaActual = bed.area;
      patient.estado = bed.area === 'Urgencias' ? 'En atención' : 'Hospitalizado';
      const movement = insertMovement(state, {
        pacienteId: patient.id,
        areaOrigen: originArea,
        areaDestino: bed.area,
        descripcion: `Asignación de cama ${bed.codigo}`,
        estado: 'completado',
        contextoAnterior: {
          paciente: previousPatient,
          cama: previousBed,
          urgencia: previousUrgency
        }
      });
      recordAction(state, {
        tipo: 'ASIGNAR_CAMA',
        descripcion: `Cama ${bed.codigo} asignada a ${fullName(patient)}`,
        entidad: { tipo: 'cama', id: bed.id },
        undo: {
          cama: previousBed,
          paciente: previousPatient,
          urgencia: previousUrgency,
          movimientoId: movement.id
        }
      });
      return { cama: enrichBed(state, bed), paciente: clone(patient) };
    });
  }

  async release(payload = {}) {
    const identifier = getBedIdentifier(payload);
    return this.store.mutate((state) => {
      const bedIndex = findBedIndex(state, identifier);
      if (bedIndex === -1) throw new NotFoundError(`No existe la cama ${identifier}`);
      const bed = state.camas[bedIndex];
      if (!bed.ocupada || bed.pacienteId === null) {
        throw new ConflictError(`La cama ${bed.codigo} ya está disponible`);
      }
      const previousBed = clone(bed);
      const patient = requirePatient(state, bed.pacienteId);
      const previousPatient = clone(patient);

      bed.ocupada = false;
      bed.pacienteId = null;
      if (patient.estado === 'Hospitalizado') patient.estado = 'En atención';
      const movement = insertMovement(state, {
        pacienteId: patient.id,
        areaOrigen: patient.areaActual,
        areaDestino: patient.areaActual,
        descripcion: `Liberación de cama ${bed.codigo}`,
        estado: 'completado',
        contextoAnterior: {
          paciente: previousPatient,
          cama: previousBed,
          urgencia: null
        }
      });
      recordAction(state, {
        tipo: 'LIBERAR_CAMA',
        descripcion: `Cama ${bed.codigo} liberada por ${fullName(patient)}`,
        entidad: { tipo: 'cama', id: bed.id },
        undo: { cama: previousBed, paciente: previousPatient, movimientoId: movement.id }
      });
      return { cama: enrichBed(state, bed), paciente: clone(patient) };
    });
  }
}

function getBedIdentifier(payload) {
  const identifier = payload.camaId ?? payload.codigo ?? payload.id;
  if (identifier === undefined || identifier === null || String(identifier).trim() === '') {
    throw new ValidationError('Debe indicar camaId o codigo', { campo: 'camaId' });
  }
  return identifier;
}

function enrichBed(state, bed) {
  const result = clone(bed);
  result.paciente = null;
  result.nombrePaciente = null;
  if (bed.pacienteId !== null) {
    for (let index = 0; index < state.pacientes.length; index += 1) {
      if (state.pacientes[index].id === bed.pacienteId) {
        result.paciente = clone(state.pacientes[index]);
        result.nombrePaciente = fullName(state.pacientes[index]);
        break;
      }
    }
  }
  return result;
}

function summarizeBeds(allBeds, filteredBeds) {
  let occupied = 0;
  for (let index = 0; index < filteredBeds.length; index += 1) {
    if (filteredBeds[index].ocupada) occupied += 1;
  }
  const perArea = [];
  const bedAreas = ['Urgencias', 'UCI', 'Hospitalización'];
  for (let areaIndex = 0; areaIndex < bedAreas.length; areaIndex += 1) {
    const area = bedAreas[areaIndex];
    let total = 0;
    let areaOccupied = 0;
    for (let bedIndex = 0; bedIndex < allBeds.length; bedIndex += 1) {
      if (allBeds[bedIndex].area === area) {
        total += 1;
        if (allBeds[bedIndex].ocupada) areaOccupied += 1;
      }
    }
    perArea.push({
      area,
      total,
      ocupadas: areaOccupied,
      disponibles: total - areaOccupied,
      porcentaje: total === 0 ? 0 : Math.round((areaOccupied / total) * 100)
    });
  }
  return {
    total: filteredBeds.length,
    ocupadas: occupied,
    disponibles: filteredBeds.length - occupied,
    porArea: perArea
  };
}

module.exports = CamasService;
module.exports.CamasService = CamasService;
module.exports.summarizeBeds = summarizeBeds;
module.exports.enrichBed = enrichBed;
