'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const BinarySearchTree = require('../backend/structures/BinarySearchTree');
const {
  linearSearch,
  linearSearchValue,
  linearSearchAll,
  treeSearch,
  treeSearchNode,
} = require('../backend/algorithms/search');
const {
  insertionSort,
  insertionSortInPlace,
} = require('../backend/algorithms/sorting');

test('busqueda lineal devuelve indice, valor o todas las coincidencias', () => {
  const pacientes = [
    { id: 101, nombre: 'Ana', prioridad: 2 },
    { id: 102, nombre: 'Bruno', prioridad: 4 },
    { id: 103, nombre: 'Carla', prioridad: 2 },
  ];

  assert.equal(linearSearch(pacientes, 102, 'id'), 1);
  assert.equal(linearSearch(pacientes, 999, 'id'), -1);
  assert.equal(linearSearch([1, Number.NaN, 3], Number.NaN), 1);
  assert.deepEqual(
    linearSearchValue(pacientes, (paciente) => paciente.nombre.startsWith('C')),
    pacientes[2],
  );
  assert.equal(linearSearchValue(pacientes, 999, 'id'), null);
  assert.deepEqual(
    linearSearchAll(pacientes, (paciente) => paciente.prioridad === 2),
    [pacientes[0], pacientes[2]],
  );
});

test('busqueda por arbol localiza la clave sin recorrer un arreglo', () => {
  const tree = new BinarySearchTree();
  tree.insert(10452, { id: 10452, nombre: 'Paciente indice' });
  tree.insert(9000, { id: 9000, nombre: 'Paciente menor' });
  tree.insert(12000, { id: 12000, nombre: 'Paciente mayor' });

  assert.deepEqual(treeSearch(tree, '10452'), {
    id: 10452,
    nombre: 'Paciente indice',
  });
  assert.equal(treeSearch(tree, 1), null);
  assert.equal(treeSearchNode(tree.root, 12000).key, 12000);
  assert.throws(() => treeSearch(tree, 'abc'), TypeError);
});

test('Insertion Sort ordena numeros sin modificar el arreglo recibido', () => {
  const original = [8, 3, 5, 1, 3];
  const ordenado = insertionSort(original);

  assert.deepEqual(ordenado, [1, 3, 3, 5, 8]);
  assert.deepEqual(original, [8, 3, 5, 1, 3]);
  assert.notEqual(ordenado, original);
});

test('Insertion Sort es generico, acepta comparador o clave y es estable', () => {
  const pacientes = [
    { nombre: 'Zoe', prioridad: 3, ordenLlegada: 1 },
    { nombre: 'Ana', prioridad: 1, ordenLlegada: 2 },
    { nombre: 'Luis', prioridad: 3, ordenLlegada: 3 },
  ];

  assert.deepEqual(
    insertionSort(pacientes, 'nombre').map((paciente) => paciente.nombre),
    ['Ana', 'Luis', 'Zoe'],
  );

  const porPrioridad = insertionSort(
    pacientes,
    (a, b) => a.prioridad - b.prioridad,
  );
  assert.deepEqual(
    porPrioridad.map((paciente) => paciente.ordenLlegada),
    [2, 1, 3],
  );

  const descendente = pacientes.slice();
  assert.equal(insertionSortInPlace(descendente, (a, b) => b.prioridad - a.prioridad), descendente);
  assert.deepEqual(descendente.map((paciente) => paciente.prioridad), [3, 3, 1]);
});

test('Insertion Sort no depende del metodo nativo de ordenamiento', () => {
  const nativeSort = Array.prototype.sort;
  let resultado;

  Array.prototype.sort = () => {
    throw new Error('No debe invocarse');
  };
  try {
    resultado = insertionSort([4, 2, 7, 1]);
  } finally {
    Array.prototype.sort = nativeSort;
  }

  assert.deepEqual(resultado, [1, 2, 4, 7]);
});

