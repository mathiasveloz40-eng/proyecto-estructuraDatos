'use strict';

class Stack {
  constructor(valores = []) {
    if (valores == null || typeof valores[Symbol.iterator] !== 'function') {
      throw new TypeError('Los valores iniciales deben ser iterables');
    }
    this._items = [];
    for (const valor of valores) {
      this.push(valor);
    }
  }

  push(valor) {
    this._items[this._items.length] = valor;
    return this._items.length;
  }

  pop() {
    if (this.isEmpty()) {
      return undefined;
    }
    return this._items.pop();
  }

  peek() {
    if (this.isEmpty()) {
      return undefined;
    }
    return this._items[this._items.length - 1];
  }

  isEmpty() {
    return this._items.length === 0;
  }

  size() {
    return this._items.length;
  }

  toArray() {
    return this._items.slice();
  }

  clear() {
    this._items.length = 0;
  }

  apilar(valor) {
    return this.push(valor);
  }

  desapilar() {
    return this.pop();
  }

  cima() {
    return this.peek();
  }

  estaVacia() {
    return this.isEmpty();
  }

  tamanio() {
    return this.size();
  }
}

const Pila = Stack;

module.exports = Stack;
module.exports.Stack = Stack;
module.exports.Pila = Pila;

