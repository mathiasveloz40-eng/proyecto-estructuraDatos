'use strict';

function defaultCompare(a, b) {
  if (Object.is(a, b)) {
    return 0;
  }
  if (a === null || a === undefined) {
    return 1;
  }
  if (b === null || b === undefined) {
    return -1;
  }
  return a < b ? -1 : 1;
}

function crearComparador(comparatorOrKey) {
  if (comparatorOrKey === undefined) {
    return defaultCompare;
  }
  if (typeof comparatorOrKey === 'function') {
    return comparatorOrKey;
  }
  if (typeof comparatorOrKey === 'string' || typeof comparatorOrKey === 'number') {
    return (a, b) => defaultCompare(
      a == null ? undefined : a[comparatorOrKey],
      b == null ? undefined : b[comparatorOrKey],
    );
  }
  throw new TypeError('El comparador debe ser una funcion o una clave');
}

/**
 * Insertion Sort estable y generico. Devuelve un arreglo nuevo para no modificar
 * la coleccion recibida. Complejidad O(n^2) en promedio y O(n) si ya esta ordenado.
 */
function insertionSort(items, comparatorOrKey) {
  if (items == null || typeof items[Symbol.iterator] !== 'function') {
    throw new TypeError('Los elementos deben ser iterables');
  }

  const resultado = Array.from(items);
  return insertionSortInPlace(resultado, comparatorOrKey);
}

function insertionSortInPlace(items, comparatorOrKey) {
  if (!Array.isArray(items)) {
    throw new TypeError('La variante in-place requiere un arreglo');
  }

  const compare = crearComparador(comparatorOrKey);

  for (let indice = 1; indice < items.length; indice += 1) {
    const actual = items[indice];
    let posicion = indice - 1;

    while (posicion >= 0 && compare(items[posicion], actual) > 0) {
      items[posicion + 1] = items[posicion];
      posicion -= 1;
    }

    items[posicion + 1] = actual;
  }

  return items;
}

const ordenamientoInsercion = insertionSort;
const ordenarPorInsercion = insertionSort;

module.exports = {
  insertionSort,
  insertionSortInPlace,
  defaultCompare,
  ordenamientoInsercion,
  ordenarPorInsercion,
};

