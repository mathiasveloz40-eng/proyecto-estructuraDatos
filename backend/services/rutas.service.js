'use strict';

const Graph = require('../structures/Graph');
const { AREAS, CONEXIONES, canonicalArea } = require('../config/catalogs');
const { ValidationError, NotFoundError } = require('../utils/errors');

class RutasService {
  constructor() {
    this.graph = new Graph(false);
    for (let index = 0; index < AREAS.length; index += 1) this.graph.addNode(AREAS[index]);
    for (let index = 0; index < CONEXIONES.length; index += 1) {
      this.graph.addEdge(CONEXIONES[index][0], CONEXIONES[index][1]);
    }
  }

  calculate(originValue, destinationValue) {
    if (!originValue || !destinationValue) {
      throw new ValidationError('Debe indicar origen y destino', { campos: ['origen', 'destino'] });
    }
    const origin = canonicalArea(originValue);
    const destination = canonicalArea(destinationValue);
    if (!origin) throw new ValidationError('El origen no pertenece al catálogo de áreas', { campo: 'origen' });
    if (!destination) throw new ValidationError('El destino no pertenece al catálogo de áreas', { campo: 'destino' });

    const path = this.graph.shortestPath(origin, destination);
    if (path.length === 0) throw new NotFoundError(`No existe una ruta interna entre ${origin} y ${destination}`);
    return {
      origen: origin,
      destino: destination,
      ruta: path,
      pasos: Math.max(0, path.length - 1),
      texto: path.join(' → ')
    };
  }

  catalog() {
    const connections = [];
    for (let index = 0; index < CONEXIONES.length; index += 1) {
      connections.push({ origen: CONEXIONES[index][0], destino: CONEXIONES[index][1] });
    }
    const adjacency = [];
    for (let index = 0; index < AREAS.length; index += 1) {
      adjacency.push({ area: AREAS[index], conexiones: this.graph.getNeighbors(AREAS[index]) });
    }
    return { areas: AREAS.slice(), conexiones: connections, adyacencia: adjacency };
  }
}

module.exports = RutasService;
module.exports.RutasService = RutasService;
