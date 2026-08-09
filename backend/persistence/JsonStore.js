'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { clone } = require('../utils/value');
const { PersistenceError } = require('../utils/errors');

class JsonStore {
  constructor(filePath, seedFactory) {
    this.filePath = path.resolve(filePath);
    this.seedFactory = seedFactory;
    this.state = null;
    this.initialized = false;
    this.initializing = null;
    this.mutationTail = Promise.resolve();
  }

  async initialize() {
    if (this.initialized) return;
    if (this.initializing) return this.initializing;

    this.initializing = this.#initializeOnce();
    try {
      await this.initializing;
      this.initialized = true;
    } finally {
      this.initializing = null;
    }
  }

  async #initializeOnce() {
    await fs.promises.mkdir(path.dirname(this.filePath), { recursive: true });
    try {
      const raw = await fs.promises.readFile(this.filePath, 'utf8');
      this.state = JSON.parse(raw);
      this.#assertShape(this.state);
    } catch (error) {
      if (error.code !== 'ENOENT') {
        if (error instanceof PersistenceError) throw error;
        throw new PersistenceError('No se pudo leer la base de datos JSON', { causa: error.message });
      }
      this.state = this.seedFactory();
      this.#assertShape(this.state);
      await this.#writeAtomic(this.state);
    }
  }

  async read() {
    await this.initialize();
    await this.mutationTail;
    return clone(this.state);
  }

  async mutate(mutator) {
    await this.initialize();
    const operation = this.mutationTail.then(async () => {
      const draft = clone(this.state);
      const result = await mutator(draft);
      draft.meta = draft.meta || {};
      draft.meta.updatedAt = new Date().toISOString();
      this.#assertShape(draft);
      await this.#writeAtomic(draft);
      this.state = draft;
      return clone(result);
    });

    this.mutationTail = operation.catch(() => undefined);
    return operation;
  }

  async #writeAtomic(value) {
    const temporaryPath = `${this.filePath}.${process.pid}.${crypto.randomUUID()}.tmp`;
    let handle;
    try {
      handle = await fs.promises.open(temporaryPath, 'wx');
      await handle.writeFile(`${JSON.stringify(value, null, 2)}\n`, 'utf8');
      await handle.sync();
      await handle.close();
      handle = null;
      await fs.promises.rename(temporaryPath, this.filePath);
    } catch (error) {
      if (handle) await handle.close().catch(() => undefined);
      await fs.promises.unlink(temporaryPath).catch(() => undefined);
      throw new PersistenceError('No se pudo guardar la base de datos JSON', { causa: error.message });
    }
  }

  #assertShape(state) {
    const collections = ['pacientes', 'urgencias', 'camas', 'movimientos', 'acciones', 'actividad'];
    if (!state || typeof state !== 'object') {
      throw new PersistenceError('El archivo de datos no contiene un objeto JSON válido');
    }
    for (let index = 0; index < collections.length; index += 1) {
      if (!Array.isArray(state[collections[index]])) {
        throw new PersistenceError(`La colección ${collections[index]} no es válida`);
      }
    }
    if (!state.config || typeof state.config !== 'object') {
      throw new PersistenceError('La configuración de la base de datos no es válida');
    }
  }
}

module.exports = JsonStore;
module.exports.JsonStore = JsonStore;
