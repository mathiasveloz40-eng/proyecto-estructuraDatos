'use strict';

const { insertionSort } = require('../algorithms/sorting');
const { PRIORIDADES, getPrioridad } = require('../config/catalogs');
const { clone } = require('../utils/value');
const { requirePatient } = require('./domain.helpers');
const { enrichUrgency, waitingMinutes } = require('./urgencias.service');
const { summarizeBeds } = require('./camas.service');
const { enrichMovement } = require('./movimientos.service');

class DashboardService {
  constructor(store) {
    this.store = store;
  }

  async get() {
    const state = await this.store.read();
    const waitingEntries = [];
    let priorityAttention = 0;
    let waitingMinutesTotal = 0;
    for (let index = 0; index < state.urgencias.length; index += 1) {
      const entry = state.urgencias[index];
      if (entry.estado !== 'espera') continue;
      waitingEntries.push(entry);
      waitingMinutesTotal += waitingMinutes(entry);
      if (entry.prioridad <= 2) priorityAttention += 1;
    }

    let occupiedBeds = 0;
    for (let index = 0; index < state.camas.length; index += 1) {
      if (state.camas[index].ocupada) occupiedBeds += 1;
    }
    let pendingTransfers = 0;
    for (let index = 0; index < state.movimientos.length; index += 1) {
      if (state.movimientos[index].estado === 'pendiente') pendingTransfers += 1;
    }

    const bedsAvailable = state.camas.length - occupiedBeds;
    const occupancy = state.camas.length === 0 ? 0 : Math.round((occupiedBeds / state.camas.length) * 100);
    const averageWait = waitingEntries.length === 0 ? 0 : Math.round(waitingMinutesTotal / waitingEntries.length);

    let waitingPatients = [];
    for (let index = 0; index < waitingEntries.length; index += 1) {
      waitingPatients.push(enrichUrgency(waitingEntries[index], requirePatient(state, waitingEntries[index].pacienteId)));
    }
    waitingPatients = insertionSort(waitingPatients, (a, b) => (
      a.prioridad - b.prioridad || new Date(a.horaLlegada) - new Date(b.horaLlegada)
    )).slice(0, 10);

    let recentMovements = insertionSort(state.movimientos, (a, b) => new Date(b.fecha) - new Date(a.fecha));
    recentMovements = recentMovements.slice(0, 8).map((movement) => enrichMovement(state, movement));
    const bedSummary = summarizeBeds(state.camas, state.camas);
    const recentActivity = insertionSort(state.actividad, (a, b) => new Date(b.fecha) - new Date(a.fecha))
      .slice(0, 6)
      .map((action) => clone(action));

    return {
      metricas: {
        pacientesEnEspera: waitingEntries.length,
        atencionPrioritaria: priorityAttention,
        camasDisponibles: bedsAvailable,
        camasTotales: state.camas.length,
        ocupacionPorcentaje: occupancy,
        tiempoPromedioEsperaMin: averageWait,
        trasladosPendientes: pendingTransfers
      },
      pacientesEnEspera: waitingPatients,
      camasPorArea: bedSummary.porArea,
      ocupacionPorArea: bedSummary.porArea,
      movimientosRecientes: recentMovements,
      actividadReciente: recentActivity,
      alertas: buildAlerts(waitingPatients, bedSummary.porArea, pendingTransfers),
      actualizadoEn: new Date().toISOString()
    };
  }
}

function buildAlerts(waitingPatients, bedsPerArea, pendingTransfers) {
  const alerts = [];
  for (let index = 0; index < waitingPatients.length; index += 1) {
    const patient = waitingPatients[index];
    const priority = getPrioridad(patient.prioridad);
    if (patient.prioridad === 1 || patient.tiempoEsperaMin > priority.tiempoObjetivoMin) {
      alerts.push({
        tipo: patient.prioridad <= 2 ? 'critica' : 'advertencia',
        titulo: `Atención prioritaria: ${patient.nombre}`,
        detalle: `Prioridad ${patient.prioridad} · ${patient.tiempoEsperaMin} min de espera`,
        pacienteId: patient.pacienteId
      });
    }
  }
  for (let index = 0; index < bedsPerArea.length; index += 1) {
    const summary = bedsPerArea[index];
    if (summary.porcentaje >= 85) {
      alerts.push({
        tipo: 'advertencia',
        titulo: `Alta ocupación en ${summary.area}`,
        detalle: `${summary.ocupadas} de ${summary.total} camas ocupadas`
      });
    }
  }
  if (pendingTransfers > 0) {
    alerts.push({
      tipo: 'informativa',
      titulo: 'Traslados por coordinar',
      detalle: `${pendingTransfers} solicitud${pendingTransfers === 1 ? '' : 'es'} pendiente${pendingTransfers === 1 ? '' : 's'}`
    });
  }
  return alerts.slice(0, 8);
}

module.exports = DashboardService;
module.exports.DashboardService = DashboardService;
