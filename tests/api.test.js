'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { test } = require('node:test');
const { createHospitalServer } = require('../backend/server');

test('API integrada: CRUD, prioridad, camas, movimientos, deshacer y persistencia', async (context) => {
  const temporaryDirectory = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'hospital-flow-api-'));
  const dataFile = path.join(temporaryDirectory, 'database.json');
  let application = createHospitalServer({ dataFile });
  let address = await application.start(0, '127.0.0.1');

  context.after(async () => {
    await application.stop().catch(() => undefined);
    await fs.promises.rm(temporaryDirectory, { recursive: true, force: true });
  });

  async function request(route, options = {}, expectedStatus = 200) {
    const requestOptions = { ...options, headers: { Connection: 'close', ...(options.headers || {}) } };
    if (requestOptions.body && typeof requestOptions.body !== 'string') {
      requestOptions.headers['Content-Type'] = 'application/json';
      requestOptions.body = JSON.stringify(requestOptions.body);
    }
    const response = await fetch(`${address.url}${route}`, requestOptions);
    const text = await response.text();
    const body = text ? JSON.parse(text) : null;
    assert.equal(response.status, expectedStatus, `${route}: ${text}`);
    return body;
  }

  const dashboard = await request('/api/dashboard');
  assert.equal(dashboard.metricas.pacientesEnEspera, 7);
  assert.equal(dashboard.metricas.camasTotales, 24);
  assert.equal(dashboard.metricas.trasladosPendientes, 3);

  const invalidStaticMethod = await fetch(`${address.url}/index.html`, { method: 'POST' });
  assert.equal(invalidStaticMethod.status, 405);
  assert.equal(invalidStaticMethod.headers.get('allow'), 'GET, HEAD');

  const route = await request('/api/rutas?origen=Urgencias&destino=Farmacia');
  assert.deepEqual(route.ruta, ['Urgencias', 'Hospitalización', 'Farmacia']);

  const next = await request('/api/urgencias/siguiente', { method: 'POST', body: {} });
  assert.equal(next.paciente.id, 10453, 'se atiende primero el nivel 1');
  const undoCall = await request('/api/deshacer', { method: 'POST', body: {} });
  assert.equal(undoCall.accion.tipo, 'LLAMAR_URGENCIAS');

  const patientInput = {
    historiaClinica: 10999,
    nombres: 'Prueba',
    apellidos: 'Integral',
    cedula: '1799999999',
    fechaNacimiento: '1990-01-01',
    sexo: 'Otro',
    telefono: '0999999999',
    contactoEmergencia: 'Contacto de prueba - 0988888888',
    fechaIngreso: new Date().toISOString(),
    estado: 'Registrado',
    areaActual: 'Triaje',
    prioridad: 4
  };
  const created = await request('/api/pacientes', { method: 'POST', body: patientInput }, 201);
  assert.equal(created.id, 10999);
  assert.equal(created.historial.length, 1);
  assert.equal((await request('/api/pacientes/buscar?historiaClinica=10999')).id, 10999);

  const duplicate = await request('/api/pacientes', {
    method: 'POST',
    body: { ...patientInput, cedula: '1799999998' }
  }, 409);
  assert.equal(duplicate.error.code, 'CONFLICT');

  const updated = await request('/api/pacientes/10999', {
    method: 'PATCH',
    body: { telefono: '0981112233', prioridad: 3 }
  });
  assert.equal(updated.telefono, '0981112233');
  assert.equal(updated.prioridad, 3);

  const admission = await request('/api/urgencias', {
    method: 'POST',
    body: { pacienteId: 10999, prioridad: 3 }
  }, 201);
  assert.equal(admission.estado, 'En espera');
  assert.equal(admission.estadoCodigo, 'espera');

  const assigned = await request('/api/camas/asignar', {
    method: 'POST',
    body: { camaId: 3, pacienteId: 10999 }
  });
  assert.equal(assigned.cama.ocupada, true);
  assert.equal(assigned.paciente.estado, 'En atención');

  const duplicateAdmission = await request('/api/urgencias', {
    method: 'POST',
    body: { pacienteId: 10999, prioridad: 3 }
  }, 409);
  assert.equal(duplicateAdmission.error.code, 'CONFLICT', 'atencion también es un episodio activo');

  const released = await request('/api/camas/liberar', { method: 'POST', body: { camaId: 3 } });
  assert.equal(released.cama.ocupada, false);
  assert.equal((await request('/api/deshacer', { method: 'POST', body: {} })).accion.tipo, 'LIBERAR_CAMA');
  assert.equal((await request('/api/camas?area=Urgencias')).camas[2].ocupada, true);
  assert.equal((await request('/api/deshacer', { method: 'POST', body: {} })).accion.tipo, 'ASIGNAR_CAMA');
  const bedAfterUndo = await request('/api/camas?area=Urgencias');
  assert.equal(bedAfterUndo.camas[2].ocupada, false);

  const pendingMovement = await request('/api/movimientos', {
    method: 'POST',
    body: { pacienteId: 10999, area: 'Laboratorio', estado: 'pendiente', descripcion: 'Descripción original' }
  }, 201);
  await request(`/api/movimientos/${pendingMovement.id}`, {
    method: 'PUT',
    body: { descripcion: 'Descripción editada' }
  });
  assert.equal((await request(`/api/movimientos/${pendingMovement.id}`)).descripcion, 'Descripción editada');
  assert.equal((await request('/api/deshacer', { method: 'POST', body: {} })).accion.tipo, 'ACTUALIZAR_MOVIMIENTO');
  assert.equal((await request(`/api/movimientos/${pendingMovement.id}`)).descripcion, 'Descripción original');

  const deletedMovement = await request(`/api/movimientos/${pendingMovement.id}`, { method: 'DELETE' });
  assert.equal(deletedMovement.eliminado, true);
  assert.equal((await request('/api/deshacer', { method: 'POST', body: {} })).accion.tipo, 'ELIMINAR_MOVIMIENTO');
  assert.equal((await request(`/api/movimientos/${pendingMovement.id}`)).id, pendingMovement.id);

  const deletedPatient = await request('/api/pacientes/10999', { method: 'DELETE' });
  assert.equal(deletedPatient.eliminado, true);
  assert.equal((await request('/api/pacientes/10999', {}, 404)).error.code, 'NOT_FOUND');
  assert.equal((await request('/api/deshacer', { method: 'POST', body: {} })).accion.tipo, 'ELIMINAR_PACIENTE');
  assert.equal((await request('/api/pacientes/10999')).id, 10999);

  await application.stop();
  application = createHospitalServer({ dataFile });
  address = await application.start(0, '127.0.0.1');
  const persisted = await request('/api/pacientes/10999');
  assert.equal(persisted.telefono, '0981112233');
  assert.ok(persisted.historial.length >= 2);
});

test('coherencia entre episodios, camas e historial en casos límite', async (context) => {
  const temporaryDirectory = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'hospital-flow-consistency-'));
  const dataFile = path.join(temporaryDirectory, 'database.json');
  const application = createHospitalServer({ dataFile });
  const address = await application.start(0, '127.0.0.1');
  context.after(async () => {
    await application.stop().catch(() => undefined);
    await fs.promises.rm(temporaryDirectory, { recursive: true, force: true });
  });

  async function request(route, options = {}, expectedStatus = 200) {
    const requestOptions = { ...options, headers: { Connection: 'close', ...(options.headers || {}) } };
    if (requestOptions.body && typeof requestOptions.body !== 'string') {
      requestOptions.headers['Content-Type'] = 'application/json';
      requestOptions.body = JSON.stringify(requestOptions.body);
    }
    const response = await fetch(`${address.url}${route}`, requestOptions);
    const text = await response.text();
    const body = text ? JSON.parse(text) : null;
    assert.equal(response.status, expectedStatus, `${route}: ${text}`);
    return body;
  }

  const first = await request('/api/urgencias/siguiente', { method: 'POST', body: {} });
  const second = await request('/api/urgencias/siguiente', { method: 'POST', body: {} });
  const third = await request('/api/urgencias/siguiente', { method: 'POST', body: {} });
  assert.deepEqual(
    [first.paciente.id, second.paciente.id, third.paciente.id],
    [10453, 10451, 10461],
    'se prioriza nivel y dentro del nivel se conserva orden de llegada'
  );

  const waitingAscending = await request('/api/urgencias?estado=espera&orden=espera&direccion=asc');
  for (let index = 1; index < waitingAscending.pacientes.length; index += 1) {
    assert.ok(
      waitingAscending.pacientes[index - 1].tiempoEsperaMin <= waitingAscending.pacientes[index].tiempoEsperaMin,
      'direccion asc ordena el menor tiempo de espera primero'
    );
  }

  await request('/api/urgencias', {
    method: 'POST',
    body: { pacienteId: 10456, prioridad: 1 }
  }, 201);
  assert.equal((await request('/api/pacientes/10456')).cama, null, 'ingresar a Urgencias libera la cama anterior');
  await request('/api/deshacer', { method: 'POST', body: {} });
  assert.equal((await request('/api/pacientes/10456')).cama.codigo, 'UCI-01', 'deshacer restaura la cama anterior');

  const transfer = await request('/api/movimientos', {
    method: 'POST',
    body: {
      pacienteId: 10456,
      area: 'Radiología',
      fecha: '2000-01-01T10:00:00.000Z',
      descripcion: 'Control de imagen retroactivo'
    }
  }, 201);
  assert.equal((await request('/api/pacientes/10456')).cama, null);
  await request(`/api/movimientos/${transfer.id}`, { method: 'DELETE' });
  const restoredAfterDelete = await request('/api/pacientes/10456');
  assert.equal(restoredAfterDelete.areaActual, 'UCI');
  assert.equal(restoredAfterDelete.cama.codigo, 'UCI-01');
  await request('/api/deshacer', { method: 'POST', body: {} });
  const afterUndoDelete = await request('/api/pacientes/10456');
  assert.equal(afterUndoDelete.areaActual, 'Radiología');
  assert.equal(afterUndoDelete.cama, null);
  await request('/api/deshacer', { method: 'POST', body: {} });

  const historyBefore = await request('/api/pacientes/10456/historial');
  assert.equal(JSON.stringify(historyBefore).includes('contextoAnterior'), false, 'el contexto de reversión es privado');
  const intermediateId = historyBefore[0].id;
  await request(`/api/movimientos/${intermediateId}`, { method: 'DELETE' });
  await request('/api/deshacer', { method: 'POST', body: {} });
  const historyAfter = await request('/api/pacientes/10456/historial');
  assert.deepEqual(historyAfter.map((movement) => movement.id), historyBefore.map((movement) => movement.id));
  const legacyLastMovement = historyAfter[historyAfter.length - 1];
  await request(`/api/movimientos/${legacyLastMovement.id}`, { method: 'DELETE' });
  const afterLegacyDelete = await request('/api/pacientes/10456');
  assert.equal(afterLegacyDelete.areaActual, legacyLastMovement.areaOrigen);
  assert.equal(afterLegacyDelete.cama, null, 'un historial antiguo sin contexto no deja una cama incoherente');
  await request('/api/deshacer', { method: 'POST', body: {} });
  assert.equal((await request('/api/pacientes/10456')).cama.codigo, 'UCI-01');

  const blockedStateChange = await request('/api/urgencias/10454', {
    method: 'PATCH',
    body: { estado: 'En espera' }
  }, 409);
  assert.equal(blockedStateChange.error.code, 'CONFLICT', 'no se deja esperando a quien conserva cama');
  assert.equal((await request('/api/pacientes/10454', {
    method: 'PATCH',
    body: { estado: 'En espera' }
  }, 409)).error.code, 'CONFLICT');
  assert.equal((await request('/api/pacientes/10456', {
    method: 'PATCH',
    body: { estado: 'Registrado' }
  }, 409)).error.code, 'CONFLICT');
  assert.equal((await request('/api/pacientes/10455', {
    method: 'PATCH',
    body: { areaActual: 'Urgencias', estado: 'En espera' }
  }, 409)).error.code, 'CONFLICT');
  assert.equal((await request('/api/pacientes/10455', {
    method: 'PATCH',
    body: { fechaIngreso: '2100-01-01T00:00:00.000Z' }
  }, 400)).error.code, 'VALIDATION_ERROR');
  assert.equal((await request('/api/movimientos', {
    method: 'POST',
    body: { pacienteId: 10455, area: 'Laboratorio', fecha: '2100-01-01T00:00:00.000Z' }
  }, 400)).error.code, 'VALIDATION_ERROR');
  assert.equal((await request('/api/pacientes', {
    method: 'POST',
    body: {
      historiaClinica: 10998,
      nombres: 'Paciente',
      apellidos: 'Sin episodio',
      cedula: '1799999998',
      fechaNacimiento: '1992-01-01',
      sexo: 'Otro',
      telefono: '0998887777',
      contactoEmergencia: 'Contacto - 0987776666',
      estado: 'En espera',
      areaActual: 'Urgencias',
      prioridad: 3
    }
  }, 400)).error.code, 'VALIDATION_ERROR');

  const pending = await request('/api/movimientos', {
    method: 'POST',
    body: { pacienteId: 10456, area: 'Radiología', estado: 'pendiente' }
  }, 201);
  await request(`/api/movimientos/${pending.id}`, {
    method: 'PATCH',
    body: { estado: 'completado' }
  });
  assert.equal((await request('/api/pacientes/10456')).cama, null);
  await request(`/api/movimientos/${pending.id}`, { method: 'DELETE' });
  assert.equal((await request('/api/pacientes/10456')).cama.codigo, 'UCI-01');
  await request('/api/deshacer', { method: 'POST', body: {} });
  assert.equal((await request('/api/pacientes/10456')).cama, null);

  const waitingBeforeExit = (await request('/api/dashboard')).metricas.pacientesEnEspera;
  const exitMovement = await request('/api/movimientos', {
    method: 'POST',
    body: { pacienteId: 10452, area: 'Salida', descripcion: 'Alta administrativa' }
  }, 201);
  assert.equal((await request('/api/dashboard')).metricas.pacientesEnEspera, waitingBeforeExit - 1);
  await request(`/api/movimientos/${exitMovement.id}`, { method: 'DELETE' });
  const patientBackInEmergency = await request('/api/pacientes/10452');
  assert.equal(patientBackInEmergency.estado, 'En espera');
  assert.equal((await request('/api/dashboard')).metricas.pacientesEnEspera, waitingBeforeExit);

  const movedFromWaiting = await request('/api/pacientes/10452', {
    method: 'PATCH',
    body: { areaActual: 'Radiologia' }
  });
  assert.equal(movedFromWaiting.areaActual, 'Radiología');
  assert.equal(movedFromWaiting.estado, 'En atención');
  const emergencyEpisode = await request('/api/urgencias?estado=todos');
  const patientEpisode = emergencyEpisode.pacientes.find((entry) => entry.pacienteId === 10452);
  assert.equal(patientEpisode.estadoCodigo, 'atencion');
  assert.ok(patientEpisode.llamadoEn);

  await request('/api/pacientes/10460', {
    method: 'PATCH',
    body: { estado: 'En atención' }
  });
  const synchronizedEpisodes = await request('/api/urgencias?estado=todos');
  const synchronizedEpisode = synchronizedEpisodes.pacientes.find((entry) => entry.pacienteId === 10460);
  assert.equal(synchronizedEpisode.estadoCodigo, 'atencion');
  assert.ok(synchronizedEpisode.llamadoEn);
});
