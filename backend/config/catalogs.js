'use strict';

const AREAS = Object.freeze([
  'Triaje',
  'Urgencias',
  'Laboratorio',
  'Radiología',
  'UCI',
  'Quirófano',
  'Hospitalización',
  'Farmacia',
  'Salida'
]);

const PRIORIDADES = Object.freeze([
  Object.freeze({ nivel: 1, nombre: 'Crítico', color: '#b42318', tiempoObjetivoMin: 0 }),
  Object.freeze({ nivel: 2, nombre: 'Muy urgente', color: '#d92d20', tiempoObjetivoMin: 10 }),
  Object.freeze({ nivel: 3, nombre: 'Urgente', color: '#f79009', tiempoObjetivoMin: 30 }),
  Object.freeze({ nivel: 4, nombre: 'Menos urgente', color: '#1570ef', tiempoObjetivoMin: 60 }),
  Object.freeze({ nivel: 5, nombre: 'No urgente', color: '#12b76a', tiempoObjetivoMin: 120 })
]);

const ESTADOS_PACIENTE = Object.freeze([
  'Registrado',
  'En espera',
  'Llamado',
  'En atención',
  'Hospitalizado',
  'Alta'
]);

const ESTADOS_URGENCIA = Object.freeze(['espera', 'llamado', 'atencion', 'cancelado']);
const ESTADOS_MOVIMIENTO = Object.freeze(['pendiente', 'completado']);
const SEXOS = Object.freeze(['Femenino', 'Masculino', 'Otro', 'No especificado']);

const CONEXIONES = Object.freeze([
  Object.freeze(['Triaje', 'Urgencias']),
  Object.freeze(['Urgencias', 'Laboratorio']),
  Object.freeze(['Urgencias', 'Radiología']),
  Object.freeze(['Urgencias', 'UCI']),
  Object.freeze(['Urgencias', 'Hospitalización']),
  Object.freeze(['Laboratorio', 'Radiología']),
  Object.freeze(['Radiología', 'Hospitalización']),
  Object.freeze(['UCI', 'Quirófano']),
  Object.freeze(['Quirófano', 'Hospitalización']),
  Object.freeze(['Hospitalización', 'Farmacia']),
  Object.freeze(['Hospitalización', 'Salida']),
  Object.freeze(['Farmacia', 'Salida'])
]);

function removeDiacritics(value) {
  return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function canonicalArea(value) {
  const target = removeDiacritics(value).trim().toLowerCase();
  for (let index = 0; index < AREAS.length; index += 1) {
    if (removeDiacritics(AREAS[index]).toLowerCase() === target) return AREAS[index];
  }
  return null;
}

function getPrioridad(nivel) {
  const numericLevel = Number(nivel);
  for (let index = 0; index < PRIORIDADES.length; index += 1) {
    if (PRIORIDADES[index].nivel === numericLevel) return PRIORIDADES[index];
  }
  return null;
}

module.exports = {
  AREAS,
  PRIORIDADES,
  ESTADOS_PACIENTE,
  ESTADOS_URGENCIA,
  ESTADOS_MOVIMIENTO,
  SEXOS,
  CONEXIONES,
  canonicalArea,
  getPrioridad,
  removeDiacritics
};
