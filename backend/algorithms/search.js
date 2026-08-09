'use strict';

function validarArreglo(items) {
  if (!Array.isArray(items)) {
    throw new TypeError('La busqueda lineal requiere un arreglo');
  }
}

function crearPredicado(objetivo, selector) {
  if (typeof objetivo === 'function' && selector === undefined) {
    return objetivo;
  }

  let obtenerValor;
  if (selector === undefined) {
    obtenerValor = (item) => item;
  } else if (typeof selector === 'function') {
    obtenerValor = selector;
  } else if (typeof selector === 'string' || typeof selector === 'number') {
    obtenerValor = (item) => (item == null ? undefined : item[selector]);
  } else {
    throw new TypeError('El selector debe ser una funcion o una clave');
  }

  return (item, index, items) => Object.is(obtenerValor(item, index, items), objetivo);
}

/** Devuelve el indice de la primera coincidencia, o -1. */
function linearSearch(items, objetivo, selector) {
  validarArreglo(items);
  const coincide = crearPredicado(objetivo, selector);

  for (let indice = 0; indice < items.length; indice += 1) {
    if (coincide(items[indice], indice, items)) {
      return indice;
    }
  }

  return -1;
}

/** Devuelve el primer valor coincidente, o null. */
function linearSearchValue(items, objetivo, selector) {
  const indice = linearSearch(items, objetivo, selector);
  return indice === -1 ? null : items[indice];
}

/** Devuelve todas las coincidencias sin usar metodos de busqueda nativos. */
function linearSearchAll(items, objetivo, selector) {
  validarArreglo(items);
  const coincide = crearPredicado(objetivo, selector);
  const resultado = [];

  for (let indice = 0; indice < items.length; indice += 1) {
    if (coincide(items[indice], indice, items)) {
      resultado.push(items[indice]);
    }
  }

  return resultado;
}

/**
 * Busca una clave recorriendo manualmente un arbol binario.
 * Acepta un BinarySearchTree o directamente su nodo raiz.
 */
function treeSearch(treeOrRoot, key) {
  const node = treeSearchNode(treeOrRoot, key);
  return node === null ? null : obtenerValorNodo(node);
}

function treeSearchNode(treeOrRoot, key) {
  if (treeOrRoot == null) {
    return null;
  }

  const numericKey = normalizarClave(key);
  let current = Object.prototype.hasOwnProperty.call(treeOrRoot, 'root')
    ? treeOrRoot.root
    : treeOrRoot;

  while (current !== null && current !== undefined) {
    const currentKey = normalizarClave(obtenerClaveNodo(current));
    if (numericKey === currentKey) {
      return current;
    }
    current = numericKey < currentKey
      ? (current.left ?? current.izquierdo ?? null)
      : (current.right ?? current.derecho ?? null);
  }

  return null;
}

function obtenerClaveNodo(node) {
  if ('key' in node) {
    return node.key;
  }
  if ('clave' in node) {
    return node.clave;
  }
  throw new TypeError('El nodo no contiene una clave');
}

function obtenerValorNodo(node) {
  if ('value' in node) {
    return node.value;
  }
  if ('valor' in node) {
    return node.valor;
  }
  return obtenerClaveNodo(node);
}

function normalizarClave(key) {
  const numericKey = typeof key === 'string' && key.trim() !== '' ? Number(key) : key;
  if (typeof numericKey !== 'number' || !Number.isFinite(numericKey)) {
    throw new TypeError('La clave de busqueda debe ser un numero finito');
  }
  return numericKey;
}

const busquedaLineal = linearSearch;
const busquedaLinealValor = linearSearchValue;
const busquedaLinealTodos = linearSearchAll;
const busquedaEnArbol = treeSearch;

module.exports = {
  linearSearch,
  linearSearchValue,
  linearSearchAll,
  treeSearch,
  treeSearchNode,
  busquedaLineal,
  busquedaLinealValor,
  busquedaLinealTodos,
  busquedaEnArbol,
};

