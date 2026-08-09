'use strict';

const {
  AREAS,
  PRIORIDADES,
  ESTADOS_PACIENTE,
  ESTADOS_URGENCIA,
  ESTADOS_MOVIMIENTO,
  SEXOS
} = require('../config/catalogs');

class HospitalService {
  constructor(store) {
    this.store = store;
  }

  async catalogs() {
    const state = await this.store.read();
    return {
      institucion: state.config.institucion,
      areas: AREAS.slice(),
      prioridades: PRIORIDADES.map((priority) => ({ ...priority })),
      estadosPaciente: ESTADOS_PACIENTE.slice(),
      estadosUrgencia: ESTADOS_URGENCIA.slice(),
      estadosMovimiento: ESTADOS_MOVIMIENTO.slice(),
      sexos: SEXOS.slice()
    };
  }
}

module.exports = HospitalService;
module.exports.HospitalService = HospitalService;
