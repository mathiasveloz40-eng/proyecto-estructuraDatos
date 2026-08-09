const API_ROOT = "/api";

export class ApiError extends Error {
  constructor(message, { status = 0, code = "NETWORK_ERROR", details = null } = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

function buildQuery(params = {}) {
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      query.set(key, String(value));
    }
  });

  const text = query.toString();
  return text ? `?${text}` : "";
}

function getErrorDetails(payload, status) {
  const source = payload?.error ?? payload;
  const message =
    (typeof source === "string" && source) ||
    source?.message ||
    payload?.mensaje ||
    `La solicitud no pudo completarse (${status}).`;

  return {
    message,
    code: source?.code || `HTTP_${status}`,
    details: source?.details || null,
  };
}

async function request(path, options = {}) {
  const headers = new Headers(options.headers || {});
  const config = { ...options, headers };

  if (config.body && !(config.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
    if (typeof config.body !== "string") config.body = JSON.stringify(config.body);
  }

  headers.set("Accept", "application/json");

  let response;
  try {
    response = await fetch(`${API_ROOT}${path}`, config);
  } catch (error) {
    throw new ApiError("No se pudo conectar con el servidor.", {
      code: "NETWORK_ERROR",
      details: error.message,
    });
  }

  const raw = await response.text();
  let payload = null;

  if (raw) {
    try {
      payload = JSON.parse(raw);
    } catch {
      payload = { message: raw };
    }
  }

  if (!response.ok) {
    const details = getErrorDetails(payload, response.status);
    throw new ApiError(details.message, {
      status: response.status,
      code: details.code,
      details: details.details,
    });
  }

  // Se acepta tanto la respuesta directa del servidor como un envoltorio `data`.
  return payload && Object.prototype.hasOwnProperty.call(payload, "data")
    ? payload.data
    : payload;
}

export const api = {
  health: () => request("/salud"),
  getCatalogs: () => request("/catalogos"),
  getDashboard: () => request("/dashboard"),

  getPatients: (params = {}) => request(`/pacientes${buildQuery(params)}`),
  getPatient: (id) => request(`/pacientes/${encodeURIComponent(id)}`),
  findPatientByRecord: (historiaClinica) =>
    request(`/pacientes/buscar${buildQuery({ historiaClinica })}`),
  createPatient: (patient) => request("/pacientes", { method: "POST", body: patient }),
  updatePatient: (id, patient) =>
    request(`/pacientes/${encodeURIComponent(id)}`, { method: "PUT", body: patient }),
  patchPatient: (id, changes) =>
    request(`/pacientes/${encodeURIComponent(id)}`, { method: "PATCH", body: changes }),
  deletePatient: (id) => request(`/pacientes/${encodeURIComponent(id)}`, { method: "DELETE" }),
  getPatientHistory: (id) =>
    request(`/pacientes/${encodeURIComponent(id)}/historial`),

  getEmergency: (params = {}) => request(`/urgencias${buildQuery(params)}`),
  admitEmergency: (admission) => request("/urgencias", { method: "POST", body: admission }),
  updateEmergency: (patientId, changes) =>
    request(`/urgencias/${encodeURIComponent(patientId)}`, { method: "PATCH", body: changes }),
  removeEmergency: (patientId) =>
    request(`/urgencias/${encodeURIComponent(patientId)}`, { method: "DELETE" }),
  callNextPatient: () => request("/urgencias/siguiente", { method: "POST", body: {} }),

  getBeds: (params = {}) => request(`/camas${buildQuery(params)}`),
  assignBed: (assignment) => request("/camas/asignar", { method: "POST", body: assignment }),
  releaseBed: (bed) => request("/camas/liberar", { method: "POST", body: bed }),

  getMovements: (params = {}) => request(`/movimientos${buildQuery(params)}`),
  createMovement: (movement) => request("/movimientos", { method: "POST", body: movement }),
  updateMovement: (id, changes) =>
    request(`/movimientos/${encodeURIComponent(id)}`, { method: "PUT", body: changes }),
  deleteMovement: (id) =>
    request(`/movimientos/${encodeURIComponent(id)}`, { method: "DELETE" }),
  undoLastAction: () => request("/deshacer", { method: "POST", body: {} }),
  getActivity: () => request("/actividad"),

  getRouteAreas: () => request("/rutas/areas"),
  calculateRoute: (origin, destination) =>
    request(`/rutas${buildQuery({ origen: origin, destino: destination })}`),
};

export { buildQuery };
