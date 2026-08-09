const dateFormatter = new Intl.DateTimeFormat("es-EC", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

const longDateFormatter = new Intl.DateTimeFormat("es-EC", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});

const dateTimeFormatter = new Intl.DateTimeFormat("es-EC", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

const timeFormatter = new Intl.DateTimeFormat("es-EC", {
  hour: "2-digit",
  minute: "2-digit",
});

export const DEFAULT_AREAS = [
  "Triaje",
  "Urgencias",
  "Laboratorio",
  "Radiología",
  "UCI",
  "Quirófano",
  "Hospitalización",
  "Farmacia",
  "Salida",
];

export const PRIORITIES = [
  { nivel: 1, nombre: "Crítico" },
  { nivel: 2, nombre: "Muy urgente" },
  { nivel: 3, nombre: "Urgente" },
  { nivel: 4, nombre: "Menos urgente" },
  { nivel: 5, nombre: "No urgente" },
];

export function escapeHTML(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function toDate(value) {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;

  const normalized = /^\d{4}-\d{2}-\d{2}$/.test(String(value))
    ? `${value}T12:00:00`
    : value;
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatDate(value, fallback = "Sin fecha") {
  const date = toDate(value);
  return date ? dateFormatter.format(date).replace(".", "") : fallback;
}

export function formatLongDate(value = new Date()) {
  const date = toDate(value);
  return date ? longDateFormatter.format(date) : "";
}

export function formatDateTime(value, fallback = "Sin fecha") {
  const date = toDate(value);
  return date ? dateTimeFormatter.format(date).replace(".", "") : fallback;
}

export function formatTime(value, fallback = "—") {
  const date = toDate(value);
  return date ? timeFormatter.format(date) : fallback;
}

export function toDateInput(value) {
  const date = toDate(value);
  if (!date) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function toLocalDateTimeInput(value = new Date()) {
  const date = toDate(value) || new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hour}:${minute}`;
}

export function patientName(patient) {
  if (!patient) return "Paciente no identificado";
  if (patient.nombre) return patient.nombre;
  return `${patient.nombres || ""} ${patient.apellidos || ""}`.trim() || "Paciente no identificado";
}

export function initials(value) {
  const parts = String(value || "HF").trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] || ""}${parts[parts.length - 1][0] || ""}`.toUpperCase();
}

export function getPriorityName(level, catalog = PRIORITIES) {
  const numeric = Number(level);
  for (let index = 0; index < catalog.length; index += 1) {
    if (Number(catalog[index].nivel) === numeric) return catalog[index].nombre;
  }
  return numeric ? `Nivel ${numeric}` : "Sin asignar";
}

export function priorityBadge(level, name) {
  const numeric = Math.min(5, Math.max(1, Number(level) || 5));
  return `<span class="priority priority--${numeric}">Nivel ${numeric} · ${escapeHTML(name || getPriorityName(numeric))}</span>`;
}

export function statusBadge(status) {
  const original = String(status || "Sin estado");
  const normalized = original.toLocaleLowerCase("es");
  const friendlyStatuses = {
    espera: "En espera",
    llamado: "Llamado",
    atencion: "En atención",
    "en atencion": "En atención",
    cancelado: "Cancelado",
    pendiente: "Pendiente",
    completado: "Completado",
  };
  const text = friendlyStatuses[normalized.normalize("NFD").replace(/[\u0300-\u036f]/g, "")] || original;
  let type = "info";

  if (/activo|atenci|ocupad|llamad|admitid|completado/.test(normalized)) type = "success";
  if (/esper|pendiente|observaci/.test(normalized)) type = "warning";
  if (/inactiv|cancel|crític|bloquead/.test(normalized)) type = "danger";
  if (/alta|salida|disponible|finaliz/.test(normalized)) type = "info";

  return `<span class="badge badge--${type}">${escapeHTML(text)}</span>`;
}

export function unwrapCollection(payload, possibleKeys = []) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;

  for (let index = 0; index < possibleKeys.length; index += 1) {
    const value = payload?.[possibleKeys[index]];
    if (Array.isArray(value)) return value;
  }

  return [];
}

export function clamp(value, min = 0, max = 100) {
  return Math.min(max, Math.max(min, Number(value) || 0));
}

export function pluralize(value, singular, plural = `${singular}s`) {
  return `${value} ${Number(value) === 1 ? singular : plural}`;
}

export function waitLabel(minutes) {
  const total = Math.max(0, Math.round(Number(minutes) || 0));
  if (total < 60) return `${total} min`;
  const hours = Math.floor(total / 60);
  const rest = total % 60;
  return rest ? `${hours} h ${rest} min` : `${hours} h`;
}

export function insertionSort(items, compare) {
  const result = Array.from(items || []);

  for (let current = 1; current < result.length; current += 1) {
    const value = result[current];
    let previous = current - 1;

    while (previous >= 0 && compare(result[previous], value) > 0) {
      result[previous + 1] = result[previous];
      previous -= 1;
    }

    result[previous + 1] = value;
  }

  return result;
}

export function debounce(callback, delay = 250) {
  let timer = null;
  return (...args) => {
    window.clearTimeout(timer);
    timer = window.setTimeout(() => callback(...args), delay);
  };
}

export function setButtonBusy(button, busy, busyLabel = "Procesando…") {
  if (!button) return;

  if (busy) {
    button.dataset.originalHtml = button.innerHTML;
    button.disabled = true;
    button.innerHTML = `<span class="spinner" aria-hidden="true"></span>${escapeHTML(busyLabel)}`;
  } else {
    button.disabled = false;
    if (button.dataset.originalHtml) button.innerHTML = button.dataset.originalHtml;
    delete button.dataset.originalHtml;
  }
}

export function serializeForm(form) {
  const data = {};
  const formData = new FormData(form);
  formData.forEach((value, key) => {
    data[key] = typeof value === "string" ? value.trim() : value;
  });
  return data;
}

export function safeId(value) {
  return String(value ?? "").replace(/[^a-zA-Z0-9_-]/g, "-");
}

export function routeKey(first, second) {
  const a = String(first || "").trim().toLocaleLowerCase("es");
  const b = String(second || "").trim().toLocaleLowerCase("es");
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

export function isAbortError(error) {
  return error?.name === "AbortError";
}
