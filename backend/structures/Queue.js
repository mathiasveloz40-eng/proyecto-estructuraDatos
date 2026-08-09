'use strict';

/**
 * Cola con indices crecientes. dequeue es O(1) porque no desplaza el arreglo.
 */
class Queue {
  constructor(valores = []) {
    if (valores == null || typeof valores[Symbol.iterator] !== 'function') {
      throw new TypeError('Los valores iniciales deben ser iterables');
    }

    this._items = Object.create(null);
    this._front = 0;
    this._back = 0;

    for (const valor of valores) {
      this.enqueue(valor);
    }
  }

  enqueue(valor) {
    this._items[this._back] = valor;
    this._back += 1;
    return this.size();
  }

  dequeue() {
    if (this.isEmpty()) {
      return undefined;
    }

    const valor = this._items[this._front];
    delete this._items[this._front];
    this._front += 1;

    if (this._front === this._back) {
      this._front = 0;
      this._back = 0;
    }

    return valor;
  }

  peek() {
    return this.isEmpty() ? undefined : this._items[this._front];
  }

  isEmpty() {
    return this._back === this._front;
  }

  size() {
    return this._back - this._front;
  }

  getItems() {
    const valores = [];
    for (let indice = this._front; indice < this._back; indice += 1) {
      valores.push(this._items[indice]);
    }
    return valores;
  }

  clear() {
    this._items = Object.create(null);
    this._front = 0;
    this._back = 0;
  }

  encolar(valor) {
    return this.enqueue(valor);
  }

  desencolar() {
    return this.dequeue();
  }

  frente() {
    return this.peek();
  }

  estaVacia() {
    return this.isEmpty();
  }

  tamanio() {
    return this.size();
  }

  obtenerElementos() {
    return this.getItems();
  }
}

const Cola = Queue;

module.exports = Queue;
module.exports.Queue = Queue;
module.exports.Cola = Cola;

