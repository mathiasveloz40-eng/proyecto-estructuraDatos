'use strict';

const Queue = require('./Queue');

class Graph {
  constructor(directed = false) {
    this.directed = Boolean(directed);
    this.adjacencyList = new Map();
  }

  addNode(node) {
    if (!this.adjacencyList.has(node)) {
      this.adjacencyList.set(node, new Set());
      return true;
    }
    return false;
  }

  addEdge(from, to, bidirectional = !this.directed) {
    this.addNode(from);
    this.addNode(to);
    const added = !this.adjacencyList.get(from).has(to);
    this.adjacencyList.get(from).add(to);

    if (bidirectional) {
      this.adjacencyList.get(to).add(from);
    }

    return added;
  }

  removeNode(node) {
    if (!this.adjacencyList.has(node)) {
      return false;
    }

    this.adjacencyList.delete(node);
    for (const neighbors of this.adjacencyList.values()) {
      neighbors.delete(node);
    }
    return true;
  }

  removeEdge(from, to, bidirectional = !this.directed) {
    let removed = false;
    if (this.adjacencyList.has(from)) {
      removed = this.adjacencyList.get(from).delete(to) || removed;
    }
    if (bidirectional && this.adjacencyList.has(to)) {
      removed = this.adjacencyList.get(to).delete(from) || removed;
    }
    return removed;
  }

  getNeighbors(node) {
    const neighbors = this.adjacencyList.get(node);
    return neighbors ? Array.from(neighbors) : [];
  }

  hasNode(node) {
    return this.adjacencyList.has(node);
  }

  hasEdge(from, to) {
    return this.adjacencyList.has(from) && this.adjacencyList.get(from).has(to);
  }

  BFS(start, callback) {
    if (callback !== undefined && typeof callback !== 'function') {
      throw new TypeError('El callback debe ser una funcion');
    }
    if (!this.adjacencyList.has(start)) {
      return [];
    }

    const visited = new Set([start]);
    const pending = new Queue([start]);
    const order = [];

    while (!pending.isEmpty()) {
      const current = pending.dequeue();
      order.push(current);
      if (callback) {
        callback(current, order.length - 1);
      }

      for (const neighbor of this.adjacencyList.get(current)) {
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          pending.enqueue(neighbor);
        }
      }
    }

    return order;
  }

  shortestPath(start, destination) {
    if (!this.adjacencyList.has(start) || !this.adjacencyList.has(destination)) {
      return [];
    }
    if (Object.is(start, destination)) {
      return [start];
    }

    const visited = new Set([start]);
    const previous = new Map([[start, null]]);
    const pending = new Queue([start]);

    while (!pending.isEmpty()) {
      const current = pending.dequeue();
      for (const neighbor of this.adjacencyList.get(current)) {
        if (visited.has(neighbor)) {
          continue;
        }

        visited.add(neighbor);
        previous.set(neighbor, current);

        if (Object.is(neighbor, destination)) {
          return Graph._buildPath(previous, destination);
        }

        pending.enqueue(neighbor);
      }
    }

    return [];
  }

  rutaMasCorta(origen, destino) {
    return this.shortestPath(origen, destino);
  }

  bfs(start, callback) {
    return this.BFS(start, callback);
  }

  agregarNodo(node) {
    return this.addNode(node);
  }

  agregarArista(from, to, bidirectional = !this.directed) {
    return this.addEdge(from, to, bidirectional);
  }

  eliminarNodo(node) {
    return this.removeNode(node);
  }

  eliminarArista(from, to, bidirectional = !this.directed) {
    return this.removeEdge(from, to, bidirectional);
  }

  obtenerVecinos(node) {
    return this.getNeighbors(node);
  }

  getNodes() {
    return Array.from(this.adjacencyList.keys());
  }

  get listaAdyacencia() {
    return this.adjacencyList;
  }

  static _buildPath(previous, destination) {
    const path = [];
    let current = destination;
    while (current !== null) {
      path.push(current);
      current = previous.get(current);
    }
    path.reverse();
    return path;
  }
}

const Grafo = Graph;

module.exports = Graph;
module.exports.Graph = Graph;
module.exports.Grafo = Grafo;

