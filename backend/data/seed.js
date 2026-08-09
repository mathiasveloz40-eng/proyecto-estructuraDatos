'use strict';

function createSeedData() {
  const now = Date.now();
  const minutesAgo = (minutes) => new Date(now - minutes * 60_000).toISOString();
  const daysAgo = (days) => new Date(now - days * 86_400_000).toISOString();

  const rawPatients = [
    [10451, 'Ana', 'Mendoza', '1712458101', '1988-04-12', 'Femenino', '0994102201', 'Carlos Mendoza - 0987654101', 'En espera', 'Urgencias', 2, 75],
    [10452, 'Luis', 'Cabrera', '0923456712', '1976-11-03', 'Masculino', '0982103302', 'María Cabrera - 0971122300', 'En espera', 'Urgencias', 3, 54],
    [10453, 'Sofía', 'Paredes', '1756782304', '1995-07-21', 'Femenino', '0967204403', 'Elena Paredes - 0996112200', 'En espera', 'Urgencias', 1, 18],
    [10454, 'Mateo', 'Vera', '0912345605', '1964-01-15', 'Masculino', '0998305504', 'Rosa Vera - 0984413322', 'En atención', 'Urgencias', 2, 102],
    [10455, 'Valentina', 'Torres', '1723456706', '2001-09-30', 'Femenino', '0959406605', 'Jorge Torres - 0965532211', 'En atención', 'Radiología', 3, 88],
    [10456, 'Diego', 'Salazar', '0909876507', '1958-05-08', 'Masculino', '0981507706', 'Lucía Salazar - 0998841122', 'Hospitalizado', 'UCI', 1, 420],
    [10457, 'Camila', 'Rojas', '1765432108', '1983-02-26', 'Femenino', '0972608807', 'Andrés Rojas - 0962277344', 'Hospitalizado', 'Hospitalización', 4, 1_540],
    [10458, 'Andrés', 'Molina', '0954321009', '1971-12-17', 'Masculino', '0963709908', 'Patricia Molina - 0992377455', 'Hospitalizado', 'Hospitalización', 3, 2_110],
    [10459, 'Isabella', 'León', '1743210910', '1990-06-09', 'Femenino', '0994811009', 'Marco León - 0983456677', 'Alta', 'Salida', 5, 3_200],
    [10460, 'Nicolás', 'Castro', '0932109811', '2008-03-04', 'Masculino', '0985922110', 'Gabriela Castro - 0974588899', 'En espera', 'Urgencias', 4, 41],
    [10461, 'Emilia', 'Guerrero', '1721098712', '1949-10-22', 'Femenino', '0976033211', 'Daniel Guerrero - 0965678800', 'En espera', 'Urgencias', 2, 27],
    [10462, 'Gabriel', 'Zambrano', '0910987613', '1967-08-14', 'Masculino', '0967144312', 'Mónica Zambrano - 0956769911', 'Hospitalizado', 'UCI', 1, 780],
    [10463, 'Mariana', 'Reyes', '1709876514', '1980-01-29', 'Femenino', '0958255413', 'Felipe Reyes - 0997861022', 'En atención', 'Urgencias', 3, 132],
    [10464, 'Tomás', 'Navarro', '0908765415', '1998-05-19', 'Masculino', '0999366514', 'Laura Navarro - 0988952133', 'En espera', 'Urgencias', 5, 16],
    [10465, 'Daniela', 'Ortega', '1757654316', '1974-07-07', 'Femenino', '0980477615', 'Miguel Ortega - 0979043244', 'Hospitalizado', 'Hospitalización', 2, 930],
    [10466, 'Joaquín', 'Peña', '0946543217', '1986-11-11', 'Masculino', '0971588716', 'Carolina Peña - 0960134355', 'En espera', 'Urgencias', 3, 9],
    [10467, 'Lucía', 'Benítez', '1735432118', '1993-04-25', 'Femenino', '0962699817', 'Raúl Benítez - 0951225466', 'Hospitalizado', 'Hospitalización', 3, 1_260],
    [10468, 'Samuel', 'Acosta', '0924321019', '1961-09-02', 'Masculino', '0953710918', 'Teresa Acosta - 0992316577', 'En atención', 'Laboratorio', 2, 167]
  ];

  const pacientes = rawPatients.map((patient) => ({
    id: patient[0],
    historiaClinica: patient[0],
    nombres: patient[1],
    apellidos: patient[2],
    cedula: patient[3],
    fechaNacimiento: patient[4],
    sexo: patient[5],
    telefono: patient[6],
    contactoEmergencia: patient[7],
    fechaIngreso: minutesAgo(patient[11]),
    estado: patient[8],
    areaActual: patient[9],
    prioridad: patient[10]
  }));

  function patientById(id) {
    for (let index = 0; index < pacientes.length; index += 1) {
      if (pacientes[index].id === id) return pacientes[index];
    }
    return null;
  }

  const waitingIds = [10453, 10451, 10461, 10452, 10466, 10460, 10464];
  const waitingMinutes = [18, 75, 27, 54, 9, 41, 16];
  const urgencias = waitingIds.map((patientId, index) => {
    const patient = patientById(patientId);
    return {
      id: `URG-${String(index + 1).padStart(4, '0')}`,
      pacienteId: patientId,
      prioridad: patient.prioridad,
      horaLlegada: minutesAgo(waitingMinutes[index]),
      estado: 'espera',
      llamadoEn: null
    };
  });
  urgencias.push({
    id: 'URG-0008', pacienteId: 10454, prioridad: 2,
    horaLlegada: minutesAgo(102), estado: 'atencion', llamadoEn: minutesAgo(62)
  });
  urgencias.push({
    id: 'URG-0009', pacienteId: 10463, prioridad: 3,
    horaLlegada: minutesAgo(132), estado: 'atencion', llamadoEn: minutesAgo(83)
  });

  const bedsByArea = [
    ['Urgencias', 'URG', 8],
    ['UCI', 'UCI', 6],
    ['Hospitalización', 'HOSP', 10]
  ];
  const ocupaciones = {
    'URG-01': 10454,
    'URG-02': 10463,
    'UCI-01': 10456,
    'UCI-02': 10462,
    'HOSP-01': 10457,
    'HOSP-02': 10458,
    'HOSP-03': 10465,
    'HOSP-04': 10467
  };
  const camas = [];
  let bedId = 1;
  for (let groupIndex = 0; groupIndex < bedsByArea.length; groupIndex += 1) {
    const [area, prefix, quantity] = bedsByArea[groupIndex];
    for (let number = 1; number <= quantity; number += 1) {
      const codigo = `${prefix}-${String(number).padStart(2, '0')}`;
      camas.push({
        id: bedId,
        codigo,
        area,
        ocupada: Boolean(ocupaciones[codigo]),
        pacienteId: ocupaciones[codigo] || null
      });
      bedId += 1;
    }
  }

  const movimientos = [];
  let movementSequence = 0;
  function addMovement(pacienteId, areaOrigen, areaDestino, minutes, descripcion, estado = 'completado') {
    movementSequence += 1;
    const movement = {
      id: `MOV-${String(movementSequence).padStart(5, '0')}`,
      pacienteId,
      area: areaDestino,
      areaOrigen,
      areaDestino,
      fecha: minutesAgo(minutes),
      descripcion,
      estado
    };
    if (estado === 'completado') movement.ordenAplicacion = movementSequence;
    movimientos.push(movement);
  }

  for (let index = 0; index < pacientes.length; index += 1) {
    const patient = pacientes[index];
    const elapsed = Math.max(20, Math.round((now - new Date(patient.fechaIngreso).getTime()) / 60_000));
    addMovement(patient.id, null, 'Triaje', elapsed, 'Ingreso y registro administrativo');
    if (patient.areaActual !== 'Triaje') {
      const secondArea = patient.areaActual === 'Salida' ? 'Urgencias' : patient.areaActual;
      addMovement(patient.id, 'Triaje', secondArea, Math.max(2, elapsed - 12), `Traslado a ${secondArea}`);
      if (patient.areaActual === 'Salida') {
        addMovement(patient.id, 'Urgencias', 'Salida', Math.max(1, elapsed - 185), 'Alta administrativa');
      }
    }
  }
  addMovement(10451, 'Urgencias', 'Laboratorio', 3, 'Solicitud de toma de muestras', 'pendiente');
  addMovement(10462, 'UCI', 'Quirófano', 14, 'Traslado coordinado con quirófano', 'pendiente');
  addMovement(10467, 'Hospitalización', 'Radiología', 22, 'Control de imagen programado', 'pendiente');

  const patient10455 = patientById(10455);
  const undoPatient10455 = { ...patient10455, areaActual: 'Urgencias' };
  let latestMovement10455 = null;
  for (let index = 0; index < movimientos.length; index += 1) {
    if (movimientos[index].pacienteId === 10455 && movimientos[index].areaDestino === 'Radiología') {
      latestMovement10455 = movimientos[index];
    }
  }
  const seedAction = {
    id: 'ACT-000006',
    tipo: 'CAMBIO_AREA',
    descripcion: 'Valentina Torres fue trasladada a Radiología',
    fecha: minutesAgo(76),
    entidad: { tipo: 'paciente', id: 10455 },
    undo: { paciente: undoPatient10455, movimientoId: latestMovement10455.id, cama: null }
  };
  const seedActivity = {
    id: seedAction.id,
    tipo: seedAction.tipo,
    descripcion: seedAction.descripcion,
    fecha: seedAction.fecha,
    entidad: seedAction.entidad
  };

  const actividad = [
    seedActivity,
    { id: 'ACT-000005', tipo: 'ASIGNAR_CAMA', descripcion: 'Cama HOSP-04 asignada a Lucía Benítez', fecha: minutesAgo(91), entidad: { tipo: 'cama', id: 18 } },
    { id: 'ACT-000004', tipo: 'LLAMAR_URGENCIAS', descripcion: 'Mariana Reyes inició atención en Urgencias', fecha: minutesAgo(83), entidad: { tipo: 'paciente', id: 10463 } },
    { id: 'ACT-000003', tipo: 'CREAR_TRASLADO', descripcion: 'Control de imagen solicitado para Lucía Benítez', fecha: minutesAgo(22), entidad: { tipo: 'paciente', id: 10467 } },
    { id: 'ACT-000002', tipo: 'CREAR_TRASLADO', descripcion: 'Traslado a quirófano solicitado para Gabriel Zambrano', fecha: minutesAgo(14), entidad: { tipo: 'paciente', id: 10462 } },
    { id: 'ACT-000001', tipo: 'INGRESO_URGENCIAS', descripcion: 'Joaquín Peña ingresó a la lista de espera', fecha: minutesAgo(9), entidad: { tipo: 'paciente', id: 10466 } }
  ];

  return {
    meta: {
      version: 1,
      createdAt: new Date(now).toISOString(),
      updatedAt: new Date(now).toISOString(),
      demo: true
    },
    config: {
      institucion: 'Hospital General San Gabriel',
      zonaHoraria: 'America/Guayaquil',
      maxAccionesDeshacer: 50,
      maxActividad: 100,
      sequences: {
        urgencia: 9,
        movimiento: movementSequence,
        accion: 6,
        aplicacionMovimiento: movementSequence
      },
      ultimaAperturaOperativa: daysAgo(0)
    },
    pacientes,
    urgencias,
    camas,
    movimientos,
    acciones: [seedAction],
    actividad
  };
}

module.exports = { createSeedData };
