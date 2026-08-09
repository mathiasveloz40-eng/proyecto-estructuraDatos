'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const LinkedList = require('../backend/structures/LinkedList');
const Stack = require('../backend/structures/Stack');
const Queue = require('../backend/structures/Queue');
const BinarySearchTree = require('../backend/structures/BinarySearchTree');
const Graph = require('../backend/structures/Graph');

test('ListaEnlazada permite CRUD por id y conserva el orden de movimientos', () => {
  const lista = new LinkedList();
  const ingreso = { id: 'm-1', area: 'Ingreso', descripcion: 'Registro' };
  const triaje = { id: 'm-2', area: 'Triaje', descripcion: 'Evaluacion' };
  const radiologia = { id: 'm-3', area: 'Radiologia', descripcion: 'Imagen' };

  lista.insertar(ingreso);
  lista.insertar(triaje);
  lista.insertar(radiologia);

  assert.equal(lista.length, 3);
  assert.equal(lista.head.valor, ingreso);
  assert.equal(lista.tail.valor, radiologia);
  assert.equal(lista.buscar('m-2'), triaje);
  assert.equal(lista.buscar({ area: 'Radiologia' }), radiologia);
  assert.equal(lista.buscar((movimiento) => movimiento.descripcion === 'Registro'), ingreso);

  const actualizado = lista.modificar('m-2', { area: 'Urgencias' });
  assert.deepEqual(actualizado, {
    id: 'm-2',
    area: 'Urgencias',
    descripcion: 'Evaluacion',
  });
  assert.equal(lista.buscar('m-2').area, 'Urgencias');

  const visitados = [];
  assert.deepEqual(
    lista.recorrer((movimiento, indice) => visitados.push(`${indice}:${movimiento.id}`)),
    [ingreso, actualizado, radiologia],
  );
  assert.deepEqual(visitados, ['0:m-1', '1:m-2', '2:m-3']);

  assert.equal(lista.eliminar('m-1'), ingreso);
  assert.equal(lista.eliminar((movimiento) => movimiento.id === 'm-3'), radiologia);
  assert.equal(lista.eliminar('inexistente'), null);
  assert.deepEqual(lista.toArray(), [actualizado]);
  assert.equal(lista.head, lista.tail);

  assert.equal(lista.eliminar('m-2'), actualizado);
  assert.equal(lista.isEmpty(), true);
  assert.equal(lista.head, null);
  assert.equal(lista.tail, null);
});

test('ListaEnlazada incluye aliases ingleses y es iterable', () => {
  const lista = new LinkedList([2]);
  lista.prepend(1);
  lista.append(3);
  lista.update(2, 20);

  assert.deepEqual([...lista], [1, 20, 3]);
  assert.equal(lista.find(20), 20);
  assert.equal(lista.remove(20), 20);
  assert.equal(lista.size(), 2);
});

test('Stack respeta LIFO y expone el ultimo elemento sin retirarlo', () => {
  const stack = new Stack();

  assert.equal(stack.isEmpty(), true);
  assert.equal(stack.pop(), undefined);
  assert.equal(stack.push({ tipo: 'ALTA' }), 1);
  assert.equal(stack.push({ tipo: 'CAMBIO_AREA' }), 2);
  assert.deepEqual(stack.peek(), { tipo: 'CAMBIO_AREA' });
  assert.equal(stack.size(), 2);
  assert.deepEqual(stack.pop(), { tipo: 'CAMBIO_AREA' });
  assert.deepEqual(stack.pop(), { tipo: 'ALTA' });
  assert.equal(stack.isEmpty(), true);
});

test('Queue respeta FIFO e intercala entradas y salidas sin perder elementos', () => {
  const queue = new Queue(['p-1', 'p-2']);

  assert.equal(queue.peek(), 'p-1');
  assert.equal(queue.dequeue(), 'p-1');
  queue.enqueue('p-3');
  queue.enqueue('p-4');
  assert.deepEqual(queue.getItems(), ['p-2', 'p-3', 'p-4']);
  assert.equal(queue.size(), 3);
  assert.equal(queue.dequeue(), 'p-2');
  assert.equal(queue.dequeue(), 'p-3');
  assert.equal(queue.dequeue(), 'p-4');
  assert.equal(queue.dequeue(), undefined);
  assert.equal(queue.isEmpty(), true);

  queue.enqueue('nuevo-ciclo');
  assert.equal(queue.peek(), 'nuevo-ciclo');
  assert.deepEqual(queue.getItems(), ['nuevo-ciclo']);
});

test('BinarySearchTree busca valores y recorre las claves en los tres ordenes', () => {
  const tree = new BinarySearchTree();
  for (const key of [50, 30, 70, 20, 40, 60, 80]) {
    tree.insert(key, `paciente-${key}`);
  }

  assert.equal(tree.size(), 7);
  assert.equal(tree.search(60), 'paciente-60');
  assert.equal(tree.search('40'), 'paciente-40');
  assert.equal(tree.search(99), null);
  assert.deepEqual(tree.inOrderKeys(), [20, 30, 40, 50, 60, 70, 80]);
  assert.deepEqual(tree.preOrderKeys(), [50, 30, 20, 40, 70, 60, 80]);
  assert.deepEqual(tree.postOrderKeys(), [20, 40, 30, 60, 80, 70, 50]);
  assert.deepEqual(tree.inOrder(), [
    'paciente-20',
    'paciente-30',
    'paciente-40',
    'paciente-50',
    'paciente-60',
    'paciente-70',
    'paciente-80',
  ]);
});

test('BinarySearchTree reemplaza duplicados y elimina hojas, nodos con un hijo y con dos hijos', () => {
  const tree = new BinarySearchTree();
  for (const key of [50, 30, 70, 20, 40, 60, 80]) {
    tree.insert(key, { id: key });
  }

  tree.insert(40, { id: 40, editado: true });
  assert.equal(tree.size(), 7);
  assert.deepEqual(tree.search(40), { id: 40, editado: true });

  assert.equal(tree.delete(20), true);
  assert.equal(tree.delete(30), true);
  assert.equal(tree.delete(50), true);
  assert.equal(tree.delete(999), false);
  assert.deepEqual(tree.inOrderKeys(), [40, 60, 70, 80]);
  assert.equal(tree.root.key, 60);
  assert.equal(tree.size(), 4);
  assert.throws(() => tree.search('no-numerica'), TypeError);
});

test('Graph recorre por amplitud y calcula la ruta con menos conexiones', () => {
  const graph = new Graph();
  graph.addEdge('Urgencias', 'Triaje');
  graph.addEdge('Triaje', 'Pasillo central');
  graph.addEdge('Pasillo central', 'Radiologia');
  graph.addEdge('Urgencias', 'Laboratorio');
  graph.addEdge('Laboratorio', 'Radiologia');
  graph.addNode('Farmacia');

  assert.deepEqual(graph.getNeighbors('Urgencias'), ['Triaje', 'Laboratorio']);
  assert.deepEqual(graph.BFS('Urgencias'), [
    'Urgencias',
    'Triaje',
    'Laboratorio',
    'Pasillo central',
    'Radiologia',
  ]);
  assert.deepEqual(graph.shortestPath('Urgencias', 'Radiologia'), [
    'Urgencias',
    'Laboratorio',
    'Radiologia',
  ]);
  assert.deepEqual(graph.rutaMasCorta('Urgencias', 'Farmacia'), []);
  assert.deepEqual(graph.shortestPath('Urgencias', 'Urgencias'), ['Urgencias']);
  assert.deepEqual(graph.shortestPath('Desconocida', 'Radiologia'), []);

  assert.equal(graph.removeEdge('Urgencias', 'Laboratorio'), true);
  assert.equal(graph.hasEdge('Laboratorio', 'Urgencias'), false);
  assert.deepEqual(graph.shortestPath('Urgencias', 'Radiologia'), [
    'Urgencias',
    'Triaje',
    'Pasillo central',
    'Radiologia',
  ]);

  assert.equal(graph.removeNode('Pasillo central'), true);
  assert.equal(graph.getNeighbors('Triaje').includes('Pasillo central'), false);
  assert.deepEqual(graph.shortestPath('Urgencias', 'Radiologia'), []);
});

test('Graph puede representar conexiones dirigidas cuando se solicita', () => {
  const graph = new Graph(true);
  graph.addEdge('Ingreso', 'Triaje');

  assert.equal(graph.hasEdge('Ingreso', 'Triaje'), true);
  assert.equal(graph.hasEdge('Triaje', 'Ingreso'), false);
  assert.deepEqual(graph.shortestPath('Triaje', 'Ingreso'), []);
});

