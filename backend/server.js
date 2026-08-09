'use strict';

const http = require('http');
const { createApplication } = require('./app');

function createHospitalServer(options = {}) {
  const application = createApplication(options);
  const server = http.createServer(application.handler);
  let address = null;

  async function start(portValue = options.port ?? process.env.PORT ?? 3000, host = options.host ?? process.env.HOST ?? '127.0.0.1') {
    if (server.listening) return address;
    const port = Number(portValue);
    if (!Number.isInteger(port) || port < 0 || port > 65_535) {
      throw new RangeError('PORT debe ser un número entre 0 y 65535');
    }
    await application.initialize();
    await new Promise((resolve, reject) => {
      const onError = (error) => {
        server.off('listening', onListening);
        reject(error);
      };
      const onListening = () => {
        server.off('error', onError);
        resolve();
      };
      server.once('error', onError);
      server.once('listening', onListening);
      server.listen(port, host);
    });
    const serverAddress = server.address();
    address = {
      host: typeof serverAddress === 'object' ? serverAddress.address : host,
      port: typeof serverAddress === 'object' ? serverAddress.port : port,
      url: `http://${host === '0.0.0.0' ? 'localhost' : host}:${typeof serverAddress === 'object' ? serverAddress.port : port}`
    };
    return address;
  }

  async function stop() {
    if (!server.listening) return;
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
    address = null;
  }

  return {
    ...application,
    server,
    start,
    stop,
    get address() { return address; }
  };
}

let defaultInstance = null;

async function start(options = {}) {
  if (!defaultInstance) defaultInstance = createHospitalServer(options);
  return defaultInstance.start(options.port, options.host);
}

async function stop() {
  if (!defaultInstance) return;
  await defaultInstance.stop();
  defaultInstance = null;
}

if (require.main === module) {
  start()
    .then((address) => {
      console.log(`Hospital Flow disponible en ${address.url}`);
    })
    .catch((error) => {
      console.error('No se pudo iniciar Hospital Flow:', error.message);
      process.exitCode = 1;
    });
}

module.exports = { createHospitalServer, createServer: createHospitalServer, start, stop };
