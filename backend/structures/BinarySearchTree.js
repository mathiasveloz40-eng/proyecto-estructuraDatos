'use strict';

function normalizarClave(clave) {
  let claveNumerica = clave;
  if (typeof clave === 'string' && clave.trim() !== '') {
    claveNumerica = Number(clave);
  }

  if (typeof claveNumerica !== 'number' || !Number.isFinite(claveNumerica)) {
    throw new TypeError('La clave del arbol debe ser un numero finito');
  }

  return claveNumerica;
}

class TreeNode {
  constructor(key, value = key) {
    this.key = normalizarClave(key);
    this.value = value;
    this.left = null;
    this.right = null;
  }

  get clave() {
    return this.key;
  }

  set clave(nuevaClave) {
    this.key = normalizarClave(nuevaClave);
  }

  get valor() {
    return this.value;
  }

  set valor(nuevoValor) {
    this.value = nuevoValor;
  }

  get izquierdo() {
    return this.left;
  }

  set izquierdo(nodo) {
    this.left = nodo;
  }

  get derecho() {
    return this.right;
  }

  set derecho(nodo) {
    this.right = nodo;
  }
}

class BinarySearchTree {
  constructor(entradas = []) {
    this.root = null;
    this._size = 0;

    if (entradas == null || typeof entradas[Symbol.iterator] !== 'function') {
      throw new TypeError('Las entradas iniciales deben ser iterables');
    }

    for (const entrada of entradas) {
      if (Array.isArray(entrada)) {
        this.insert(entrada[0], entrada[1]);
      } else if (entrada && typeof entrada === 'object' && 'key' in entrada) {
        this.insert(entrada.key, entrada.value);
      } else {
        this.insert(entrada, entrada);
      }
    }
  }

  /**
   * Inserta una clave o reemplaza el valor si ya existe, sin duplicar nodos.
   * Devuelve el nodo insertado o actualizado.
   */
  insert(key, value = key) {
    const clave = normalizarClave(key);
    const nuevoNodo = new TreeNode(clave, value);

    if (this.root === null) {
      this.root = nuevoNodo;
      this._size = 1;
      return nuevoNodo;
    }

    let actual = this.root;
    while (true) {
      if (clave === actual.key) {
        actual.value = value;
        return actual;
      }

      if (clave < actual.key) {
        if (actual.left === null) {
          actual.left = nuevoNodo;
          this._size += 1;
          return nuevoNodo;
        }
        actual = actual.left;
      } else {
        if (actual.right === null) {
          actual.right = nuevoNodo;
          this._size += 1;
          return nuevoNodo;
        }
        actual = actual.right;
      }
    }
  }

  searchNode(key) {
    const clave = normalizarClave(key);
    let actual = this.root;

    while (actual !== null) {
      if (clave === actual.key) {
        return actual;
      }
      actual = clave < actual.key ? actual.left : actual.right;
    }

    return null;
  }

  search(key) {
    const nodo = this.searchNode(key);
    return nodo === null ? null : nodo.value;
  }

  has(key) {
    return this.searchNode(key) !== null;
  }

  delete(key) {
    const clave = normalizarClave(key);
    let padre = null;
    let actual = this.root;

    while (actual !== null && actual.key !== clave) {
      padre = actual;
      actual = clave < actual.key ? actual.left : actual.right;
    }

    if (actual === null) {
      return false;
    }

    if (actual.left !== null && actual.right !== null) {
      let padreSucesor = actual;
      let sucesor = actual.right;
      while (sucesor.left !== null) {
        padreSucesor = sucesor;
        sucesor = sucesor.left;
      }

      actual.key = sucesor.key;
      actual.value = sucesor.value;
      padre = padreSucesor;
      actual = sucesor;
    }

    const hijo = actual.left !== null ? actual.left : actual.right;
    if (padre === null) {
      this.root = hijo;
    } else if (padre.left === actual) {
      padre.left = hijo;
    } else {
      padre.right = hijo;
    }

    this._size -= 1;
    return true;
  }

  inOrder(callback) {
    return this._recorrer('inOrder', callback);
  }

  preOrder(callback) {
    return this._recorrer('preOrder', callback);
  }

  postOrder(callback) {
    return this._recorrer('postOrder', callback);
  }

  inOrderKeys() {
    return this._recorrerNodos('inOrder').map((nodo) => nodo.key);
  }

  preOrderKeys() {
    return this._recorrerNodos('preOrder').map((nodo) => nodo.key);
  }

  postOrderKeys() {
    return this._recorrerNodos('postOrder').map((nodo) => nodo.key);
  }

  entries(order = 'inOrder') {
    return this._recorrerNodos(order).map((nodo) => [nodo.key, nodo.value]);
  }

  size() {
    return this._size;
  }

  isEmpty() {
    return this._size === 0;
  }

  clear() {
    this.root = null;
    this._size = 0;
  }

  insertar(key, value = key) {
    return this.insert(key, value);
  }

  buscar(key) {
    return this.search(key);
  }

  eliminar(key) {
    return this.delete(key);
  }

  enOrden(callback) {
    return this.inOrder(callback);
  }

  preOrden(callback) {
    return this.preOrder(callback);
  }

  postOrden(callback) {
    return this.postOrder(callback);
  }

  _recorrer(orden, callback) {
    if (callback !== undefined && typeof callback !== 'function') {
      throw new TypeError('El callback debe ser una funcion');
    }

    const nodos = this._recorrerNodos(orden);
    const valores = [];
    for (let indice = 0; indice < nodos.length; indice += 1) {
      const nodo = nodos[indice];
      valores.push(nodo.value);
      if (callback) {
        callback(nodo.value, nodo.key, nodo, indice);
      }
    }
    return valores;
  }

  _recorrerNodos(orden) {
    if (!['inOrder', 'preOrder', 'postOrder'].includes(orden)) {
      throw new RangeError('Orden de recorrido no valido');
    }

    const resultado = [];

    function visitar(nodo) {
      if (nodo === null) {
        return;
      }
      if (orden === 'preOrder') {
        resultado.push(nodo);
      }
      visitar(nodo.left);
      if (orden === 'inOrder') {
        resultado.push(nodo);
      }
      visitar(nodo.right);
      if (orden === 'postOrder') {
        resultado.push(nodo);
      }
    }

    visitar(this.root);
    return resultado;
  }
}

const ArbolBinarioBusqueda = BinarySearchTree;

module.exports = BinarySearchTree;
module.exports.BinarySearchTree = BinarySearchTree;
module.exports.ArbolBinarioBusqueda = ArbolBinarioBusqueda;
module.exports.TreeNode = TreeNode;
module.exports.NodoArbol = TreeNode;

