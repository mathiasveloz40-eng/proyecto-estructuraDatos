'use strict';

/**
 * Nodo simple utilizado por ListaEnlazada.
 * El valor puede ser cualquier dato; en Hospital Flow normalmente es un movimiento.
 */
class Nodo {
  constructor(valor) {
    this.valor = valor;
    this.siguiente = null;
  }

  get value() {
    return this.valor;
  }

  set value(nuevoValor) {
    this.valor = nuevoValor;
  }

  get data() {
    return this.valor;
  }

  set data(nuevoValor) {
    this.valor = nuevoValor;
  }

  get next() {
    return this.siguiente;
  }

  set next(nuevoSiguiente) {
    this.siguiente = nuevoSiguiente;
  }
}

/**
 * Lista simplemente enlazada con insercion al final en O(1).
 */
class ListaEnlazada {
  constructor(valores = []) {
    this.cabeza = null;
    this.cola = null;
    this.longitud = 0;

    if (valores == null || typeof valores[Symbol.iterator] !== 'function') {
      throw new TypeError('Los valores iniciales deben ser iterables');
    }

    for (const valor of valores) {
      this.insertar(valor);
    }
  }

  /** Agrega un valor al final y devuelve el nodo creado. */
  insertar(valor) {
    const nuevoNodo = new Nodo(valor);

    if (this.cabeza === null) {
      this.cabeza = nuevoNodo;
      this.cola = nuevoNodo;
    } else {
      this.cola.siguiente = nuevoNodo;
      this.cola = nuevoNodo;
    }

    this.longitud += 1;
    return nuevoNodo;
  }

  /** Agrega un valor al inicio y devuelve el nodo creado. */
  insertarInicio(valor) {
    const nuevoNodo = new Nodo(valor);
    nuevoNodo.siguiente = this.cabeza;
    this.cabeza = nuevoNodo;

    if (this.cola === null) {
      this.cola = nuevoNodo;
    }

    this.longitud += 1;
    return nuevoNodo;
  }

  /**
   * Elimina la primera coincidencia y devuelve su valor, o null si no existe.
   * El criterio puede ser un id, el valor exacto, un objeto parcial o un predicado.
   */
  eliminar(criterio) {
    let anterior = null;
    let actual = this.cabeza;

    while (actual !== null) {
      if (ListaEnlazada.coincide(actual.valor, criterio)) {
        if (anterior === null) {
          this.cabeza = actual.siguiente;
        } else {
          anterior.siguiente = actual.siguiente;
        }

        if (actual === this.cola) {
          this.cola = anterior;
        }

        actual.siguiente = null;
        this.longitud -= 1;
        return actual.valor;
      }

      anterior = actual;
      actual = actual.siguiente;
    }

    return null;
  }

  /** Devuelve el primer valor coincidente, o null. */
  buscar(criterio) {
    let actual = this.cabeza;

    while (actual !== null) {
      if (ListaEnlazada.coincide(actual.valor, criterio)) {
        return actual.valor;
      }
      actual = actual.siguiente;
    }

    return null;
  }

  /**
   * Actualiza la primera coincidencia y devuelve el nuevo valor, o null.
   * Para objetos, un objeto de cambios se combina sin descartar otros campos.
   * Tambien acepta una funcion (valorActual => nuevoValor).
   */
  modificar(criterio, cambios) {
    let actual = this.cabeza;

    while (actual !== null) {
      if (ListaEnlazada.coincide(actual.valor, criterio)) {
        let nuevoValor;

        if (typeof cambios === 'function') {
          const resultado = cambios(actual.valor);
          nuevoValor = resultado === undefined ? actual.valor : resultado;
        } else if (ListaEnlazada.esObjeto(actual.valor) && ListaEnlazada.esObjeto(cambios)) {
          nuevoValor = { ...actual.valor, ...cambios };
        } else {
          nuevoValor = cambios;
        }

        actual.valor = nuevoValor;
        return nuevoValor;
      }
      actual = actual.siguiente;
    }

    return null;
  }

  /**
   * Recorre en orden de insercion. El callback es opcional y recibe
   * (valor, indice, nodo). Siempre devuelve una copia de los valores.
   */
  recorrer(callback) {
    if (callback !== undefined && typeof callback !== 'function') {
      throw new TypeError('El callback debe ser una funcion');
    }

    const valores = [];
    let actual = this.cabeza;
    let indice = 0;

    while (actual !== null) {
      valores.push(actual.valor);
      if (callback) {
        callback(actual.valor, indice, actual);
      }
      actual = actual.siguiente;
      indice += 1;
    }

    return valores;
  }

  limpiar() {
    this.cabeza = null;
    this.cola = null;
    this.longitud = 0;
  }

  estaVacia() {
    return this.longitud === 0;
  }

  tamanio() {
    return this.longitud;
  }

  toArray() {
    return this.recorrer();
  }

  *[Symbol.iterator]() {
    let actual = this.cabeza;
    while (actual !== null) {
      yield actual.valor;
      actual = actual.siguiente;
    }
  }

  get head() {
    return this.cabeza;
  }

  get tail() {
    return this.cola;
  }

  get length() {
    return this.longitud;
  }

  append(valor) {
    return this.insertar(valor);
  }

  prepend(valor) {
    return this.insertarInicio(valor);
  }

  insert(valor) {
    return this.insertar(valor);
  }

  remove(criterio) {
    return this.eliminar(criterio);
  }

  delete(criterio) {
    return this.eliminar(criterio);
  }

  find(criterio) {
    return this.buscar(criterio);
  }

  search(criterio) {
    return this.buscar(criterio);
  }

  update(criterio, cambios) {
    return this.modificar(criterio, cambios);
  }

  traverse(callback) {
    return this.recorrer(callback);
  }

  isEmpty() {
    return this.estaVacia();
  }

  size() {
    return this.tamanio();
  }

  clear() {
    this.limpiar();
  }

  static esObjeto(valor) {
    return valor !== null && typeof valor === 'object' && !Array.isArray(valor);
  }

  static coincide(valor, criterio) {
    if (typeof criterio === 'function') {
      return Boolean(criterio(valor));
    }

    if (Object.is(valor, criterio)) {
      return true;
    }

    if (ListaEnlazada.esObjeto(valor)) {
      if (!ListaEnlazada.esObjeto(criterio)) {
        return Object.prototype.hasOwnProperty.call(valor, 'id') && Object.is(valor.id, criterio);
      }

      const claves = Object.keys(criterio);
      if (claves.length === 0) {
        return false;
      }
      for (const clave of claves) {
        if (!Object.is(valor[clave], criterio[clave])) {
          return false;
        }
      }
      return true;
    }

    return false;
  }
}

const LinkedList = ListaEnlazada;
const Node = Nodo;

module.exports = ListaEnlazada;
module.exports.ListaEnlazada = ListaEnlazada;
module.exports.LinkedList = LinkedList;
module.exports.Nodo = Nodo;
module.exports.Node = Node;

