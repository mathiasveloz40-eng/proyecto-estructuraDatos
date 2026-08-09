import { api } from "../api.js";
import { icon } from "../icons.js";
import {
  DEFAULT_AREAS,
  PRIORITIES,
  debounce,
  escapeHTML,
  formatDate,
  formatDateTime,
  getPriorityName,
  initials,
  patientName,
  priorityBadge,
  serializeForm,
  setButtonBusy,
  statusBadge,
  toDateInput,
  unwrapCollection,
} from "../utils.js";
import { confirmModal, openModal } from "../components/modal.js";
import { renderEmptyState, renderErrorState, renderLoadingState, renderTable } from "../components/table.js";
import { showToast } from "../components/toast.js";

const FALLBACK_CATALOGS = {
  areas: DEFAULT_AREAS,
  prioridades: PRIORITIES,
  estadosPaciente: ["Registrado", "En espera", "Llamado", "En atención", "Hospitalizado", "Alta"],
  sexos: ["Femenino", "Masculino", "Otro", "No especificado"],
};

function normalizeCatalogs(catalogs) {
  return {
    areas: catalogs?.areas?.length ? catalogs.areas : FALLBACK_CATALOGS.areas,
    prioridades: catalogs?.prioridades?.length ? catalogs.prioridades : FALLBACK_CATALOGS.prioridades,
    estadosPaciente: catalogs?.estadosPaciente?.length
      ? catalogs.estadosPaciente
      : FALLBACK_CATALOGS.estadosPaciente,
    sexos: catalogs?.sexos?.length ? catalogs.sexos : FALLBACK_CATALOGS.sexos,
  };
}

function options(items, selected, valueKey = null, labelKey = null, placeholder = "") {
  const first = placeholder ? `<option value="">${escapeHTML(placeholder)}</option>` : "";
  return `${first}${items
    .map((item) => {
      const value = valueKey ? item[valueKey] : item;
      const label = labelKey ? item[labelKey] : item;
      return `<option value="${escapeHTML(value)}"${String(value) === String(selected ?? "") ? " selected" : ""}>${escapeHTML(label)}</option>`;
    })
    .join("")}`;
}

function patientFormTemplate(patient, catalogs, editing) {
  const value = (field) => escapeHTML(patient?.[field] ?? "");
  const today = new Date().toISOString().slice(0, 10);
  return `
    <form id="patient-form" novalidate>
      <div class="form-alert" id="patient-form-alert" role="alert" hidden></div>
      <div class="form-grid">
        <label class="field">
          <span class="field__label">Historia clínica <span class="field__required">*</span></span>
          <input class="input" name="historiaClinica" type="number" min="1" step="1" value="${value("historiaClinica")}" ${editing ? "readonly" : "autofocus"} required />
          <span class="field__error" data-error-for="historiaClinica"></span>
        </label>
        <label class="field">
          <span class="field__label">Cédula <span class="field__required">*</span></span>
          <input class="input" name="cedula" inputmode="numeric" maxlength="10" pattern="[0-9]{10}" value="${value("cedula")}" required />
          <span class="field__error" data-error-for="cedula"></span>
        </label>
        <label class="field">
          <span class="field__label">Nombres <span class="field__required">*</span></span>
          <input class="input" name="nombres" maxlength="80" value="${value("nombres")}" required />
          <span class="field__error" data-error-for="nombres"></span>
        </label>
        <label class="field">
          <span class="field__label">Apellidos <span class="field__required">*</span></span>
          <input class="input" name="apellidos" maxlength="80" value="${value("apellidos")}" required />
          <span class="field__error" data-error-for="apellidos"></span>
        </label>
        <label class="field">
          <span class="field__label">Fecha de nacimiento <span class="field__required">*</span></span>
          <input class="input" name="fechaNacimiento" type="date" max="${today}" value="${toDateInput(patient?.fechaNacimiento)}" required />
          <span class="field__error" data-error-for="fechaNacimiento"></span>
        </label>
        <label class="field">
          <span class="field__label">Sexo <span class="field__required">*</span></span>
          <select class="select" name="sexo" required>${options(catalogs.sexos, patient?.sexo, null, null, "Seleccionar")}</select>
          <span class="field__error" data-error-for="sexo"></span>
        </label>
        <label class="field">
          <span class="field__label">Teléfono <span class="field__required">*</span></span>
          <input class="input" name="telefono" type="tel" maxlength="15" pattern="[0-9+() -]{7,15}" value="${value("telefono")}" required />
          <span class="field__error" data-error-for="telefono"></span>
        </label>
        <label class="field">
          <span class="field__label">Contacto de emergencia <span class="field__required">*</span></span>
          <input class="input" name="contactoEmergencia" maxlength="120" value="${value("contactoEmergencia")}" required />
          <span class="field__error" data-error-for="contactoEmergencia"></span>
        </label>
        <label class="field">
          <span class="field__label">Fecha de ingreso <span class="field__required">*</span></span>
          <input class="input" name="fechaIngreso" type="date" value="${toDateInput(patient?.fechaIngreso) || today}" required />
          <span class="field__error" data-error-for="fechaIngreso"></span>
        </label>
        <label class="field">
          <span class="field__label">Estado <span class="field__required">*</span></span>
          <select class="select" name="estado" required>${options(catalogs.estadosPaciente, patient?.estado || "Registrado")}</select>
          <span class="field__error" data-error-for="estado"></span>
        </label>
        <label class="field">
          <span class="field__label">Área actual <span class="field__required">*</span></span>
          <select class="select" name="areaActual" required>${options(catalogs.areas, patient?.areaActual || catalogs.areas[0] || "Triaje")}</select>
          <span class="field__error" data-error-for="areaActual"></span>
        </label>
        <label class="field">
          <span class="field__label">Prioridad <span class="field__required">*</span></span>
          <select class="select" name="prioridad" required>${options(catalogs.prioridades, patient?.prioridad || 5, "nivel", "nombre")}</select>
          <span class="field__error" data-error-for="prioridad"></span>
        </label>
      </div>
    </form>
  `;
}

function validatePatient(form, data) {
  const errors = {};
  const namePattern = /^[\p{L}][\p{L}\s.'-]{1,79}$/u;
  if (!/^\d+$/.test(data.historiaClinica) || Number(data.historiaClinica) <= 0) {
    errors.historiaClinica = "Ingresa un número válido.";
  }
  if (!/^\d{10}$/.test(data.cedula)) errors.cedula = "La cédula debe tener 10 dígitos.";
  if (!namePattern.test(data.nombres)) errors.nombres = "Ingresa al menos dos caracteres válidos.";
  if (!namePattern.test(data.apellidos)) errors.apellidos = "Ingresa al menos dos caracteres válidos.";
  if (!data.fechaNacimiento) errors.fechaNacimiento = "Selecciona la fecha de nacimiento.";
  if (data.fechaNacimiento && new Date(`${data.fechaNacimiento}T12:00:00`) > new Date()) {
    errors.fechaNacimiento = "La fecha no puede estar en el futuro.";
  }
  if (!data.sexo) errors.sexo = "Selecciona una opción.";
  if (!/^[0-9+() -]{7,15}$/.test(data.telefono)) errors.telefono = "Ingresa un teléfono válido.";
  if (data.contactoEmergencia.length < 4) errors.contactoEmergencia = "Ingresa el nombre y teléfono del contacto.";
  if (!data.fechaIngreso) errors.fechaIngreso = "Selecciona la fecha de ingreso.";
  if (!data.estado) errors.estado = "Selecciona un estado.";
  if (!data.areaActual) errors.areaActual = "Selecciona un área.";
  if (!/^[1-5]$/.test(data.prioridad)) errors.prioridad = "Selecciona una prioridad.";

  form.querySelectorAll("[data-error-for]").forEach((element) => {
    const fieldName = element.dataset.errorFor;
    element.textContent = errors[fieldName] || "";
    const input = form.elements[fieldName];
    input?.setAttribute("aria-invalid", errors[fieldName] ? "true" : "false");
  });

  const firstError = Object.keys(errors)[0];
  if (firstError) form.elements[firstError]?.focus();
  return !firstError;
}

export function openPatientForm({ patient = null, catalogs = FALLBACK_CATALOGS, onSaved = null } = {}) {
  const normalizedCatalogs = normalizeCatalogs(catalogs);
  const editing = Boolean(patient?.id);
  const modal = openModal({
    title: editing ? "Editar paciente" : "Registrar paciente",
    description: editing
      ? "Actualiza la información administrativa del paciente."
      : "Completa los datos para crear una nueva ficha.",
    content: patientFormTemplate(patient, normalizedCatalogs, editing),
    size: "large",
    closeOnBackdrop: false,
  });
  modal.setFooter(`
    <button class="button button--secondary" type="button" data-action="cancel">Cancelar</button>
    <button class="button button--primary" type="submit" form="patient-form" data-action="save">${editing ? "Guardar cambios" : "Registrar paciente"}</button>
  `);

  const form = modal.body.querySelector("#patient-form");
  const saveButton = modal.footer.querySelector('[data-action="save"]');
  const alert = form.querySelector("#patient-form-alert");
  modal.footer.querySelector('[data-action="cancel"]').addEventListener("click", () => modal.close());

  form.addEventListener("input", (event) => {
    event.target.removeAttribute("aria-invalid");
    const error = form.querySelector(`[data-error-for="${event.target.name}"]`);
    if (error) error.textContent = "";
    alert.hidden = true;
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const data = serializeForm(form);
    if (!validatePatient(form, data)) return;

    data.historiaClinica = Number(data.historiaClinica);
    data.prioridad = Number(data.prioridad);
    setButtonBusy(saveButton, true, editing ? "Guardando…" : "Registrando…");
    alert.hidden = true;

    try {
      const saved = editing
        ? await api.updatePatient(patient.id, data)
        : await api.createPatient(data);
      modal.close("saved");
      showToast(
        editing ? "Los cambios del paciente se guardaron correctamente." : "El paciente fue registrado correctamente.",
        { type: "success" },
      );
      await onSaved?.(saved);
    } catch (error) {
      alert.textContent = error.message;
      alert.hidden = false;
      alert.scrollIntoView({ block: "nearest" });
    } finally {
      setButtonBusy(saveButton, false);
    }
  });

  return modal;
}

function movementTimeline(history) {
  const movements = unwrapCollection(history, ["historial", "movimientos"]);
  if (!movements.length) {
    return `<p class="page-description">Todavía no se registran movimientos para este paciente.</p>`;
  }

  return `<div class="timeline">${movements
    .map(
      (movement) => `
        <div class="timeline-item">
          <span class="timeline-item__rail" aria-hidden="true"></span>
          <div class="timeline-item__copy">
            <strong>${escapeHTML(movement.area || movement.areaDestino || "Actualización")}</strong>
            <p>${escapeHTML(movement.descripcion || "Cambio de ubicación registrado")}</p>
          </div>
          <time class="timeline-item__time" datetime="${escapeHTML(movement.fecha || "")}">${formatDateTime(movement.fecha)}</time>
        </div>
      `,
    )
    .join("")}</div>`;
}

export async function openPatientDetail(patientId, { onEdit = null } = {}) {
  const modal = openModal({
    title: "Ficha del paciente",
    description: "Información administrativa, ubicación y actividad reciente.",
    content: renderLoadingState("Consultando ficha…"),
    size: "large",
  });

  try {
    const patient = await api.getPatient(patientId);
    const name = patientName(patient);
    modal.body.innerHTML = `
      <div class="patient-summary">
        <span class="avatar">${escapeHTML(initials(name))}</span>
        <div class="patient-summary__copy">
          <h3>${escapeHTML(name)}</h3>
          <p>Historia clínica ${escapeHTML(patient.historiaClinica || patient.id)} · ${escapeHTML(patient.areaActual || "Sin ubicación")}</p>
        </div>
        ${priorityBadge(patient.prioridad, getPriorityName(patient.prioridad))}
      </div>
      <dl class="detail-list">
        <div class="detail-item"><dt>Cédula</dt><dd>${escapeHTML(patient.cedula || "No registrada")}</dd></div>
        <div class="detail-item"><dt>Fecha de nacimiento</dt><dd>${formatDate(patient.fechaNacimiento)}</dd></div>
        <div class="detail-item"><dt>Sexo</dt><dd>${escapeHTML(patient.sexo || "No registrado")}</dd></div>
        <div class="detail-item"><dt>Teléfono</dt><dd>${escapeHTML(patient.telefono || "No registrado")}</dd></div>
        <div class="detail-item"><dt>Contacto de emergencia</dt><dd>${escapeHTML(patient.contactoEmergencia || "No registrado")}</dd></div>
        <div class="detail-item"><dt>Fecha de ingreso</dt><dd>${formatDate(patient.fechaIngreso)}</dd></div>
        <div class="detail-item"><dt>Estado</dt><dd>${statusBadge(patient.estado)}</dd></div>
        <div class="detail-item"><dt>Cama</dt><dd>${escapeHTML(patient.cama?.codigo || "Sin cama asignada")}</dd></div>
      </dl>
      <div class="divider"></div>
      <h3 class="card__title" style="margin-bottom:14px">Historial del paciente</h3>
      ${movementTimeline(patient.historial)}
    `;
    modal.setFooter(`
      <button class="button button--secondary" type="button" data-action="close">Cerrar</button>
      <button class="button button--primary" type="button" data-action="edit">${icon("edit")} Editar ficha</button>
    `);
    modal.footer.querySelector('[data-action="close"]').addEventListener("click", () => modal.close());
    modal.footer.querySelector('[data-action="edit"]').addEventListener("click", () => {
      modal.close();
      onEdit?.(patient);
    });
    return patient;
  } catch (error) {
    modal.body.innerHTML = renderErrorState(error.message, "Cerrar");
    modal.body.querySelector("[data-retry]")?.addEventListener("click", () => modal.close());
    return null;
  }
}

function tableMarkup(patients, catalogs) {
  return renderTable({
    rows: patients,
    emptyMessage: "No encontramos pacientes con los filtros seleccionados.",
    caption: `${patients.length} ${patients.length === 1 ? "paciente visible" : "pacientes visibles"}`,
    columns: [
      {
        label: "Paciente",
        render: (patient) => {
          const name = patientName(patient);
          return `<div class="table-primary"><span class="table-primary__avatar">${escapeHTML(initials(name))}</span><span class="table-primary__copy"><strong>${escapeHTML(name)}</strong><small>HC ${escapeHTML(patient.historiaClinica || patient.id)}</small></span></div>`;
        },
      },
      { label: "Cédula", render: (patient) => escapeHTML(patient.cedula || "—") },
      { label: "Área actual", render: (patient) => escapeHTML(patient.areaActual || "Sin ubicación") },
      {
        label: "Prioridad",
        render: (patient) => priorityBadge(patient.prioridad, getPriorityName(patient.prioridad, catalogs.prioridades)),
      },
      { label: "Ingreso", render: (patient) => formatDate(patient.fechaIngreso) },
      { label: "Estado", render: (patient) => statusBadge(patient.estado) },
      {
        label: "Acciones",
        align: "right",
        render: (patient) => `
          <div class="table-actions">
            <button class="table-action" type="button" data-action="view" data-id="${escapeHTML(patient.id)}" aria-label="Ver paciente" title="Ver paciente">${icon("eye")}</button>
            <button class="table-action" type="button" data-action="edit" data-id="${escapeHTML(patient.id)}" aria-label="Editar paciente" title="Editar paciente">${icon("edit")}</button>
            <button class="table-action table-action--danger" type="button" data-action="delete" data-id="${escapeHTML(patient.id)}" aria-label="Eliminar paciente" title="Eliminar paciente">${icon("trash")}</button>
          </div>
        `,
      },
    ],
  });
}

export async function render(container, context = {}) {
  const routeSearch = context.route?.query?.get("buscar") || "";
  const detailId = context.route?.query?.get("detalle");
  const state = {
    patients: [],
    catalogs: FALLBACK_CATALOGS,
    filters: { buscar: routeSearch, area: "", estado: "", prioridad: "", orden: "nombre", direccion: "asc" },
    requestNumber: 0,
  };

  container.innerHTML = renderLoadingState("Cargando pacientes…");

  try {
    const [catalogs] = await Promise.all([
      api.getCatalogs().catch(() => FALLBACK_CATALOGS),
    ]);
    state.catalogs = normalizeCatalogs(catalogs);
  } catch {
    state.catalogs = FALLBACK_CATALOGS;
  }

  container.innerHTML = `
    <section class="page" aria-labelledby="patients-title">
      <header class="page-header">
        <div class="page-header__copy">
          <p class="eyebrow">Registro central</p>
          <h1 class="page-title" id="patients-title">Pacientes</h1>
          <p class="page-description">Consulta y administra las fichas operativas del centro asistencial.</p>
        </div>
        <div class="page-header__actions">
          <button class="button button--primary" type="button" data-new-patient>${icon("userPlus")} Registrar paciente</button>
        </div>
      </header>
      <article class="card">
        <div class="toolbar">
          <div class="input-wrap toolbar__grow">
            ${icon("search")}
            <label class="sr-only" for="patient-search">Buscar pacientes</label>
            <input class="input" id="patient-search" type="search" value="${escapeHTML(routeSearch)}" placeholder="Nombre, cédula o historia clínica" />
          </div>
          <select class="select" id="patient-area" aria-label="Filtrar por área">${options(state.catalogs.areas, "", null, null, "Todas las áreas")}</select>
          <select class="select" id="patient-status" aria-label="Filtrar por estado">${options(state.catalogs.estadosPaciente, "", null, null, "Todos los estados")}</select>
          <select class="select" id="patient-priority" aria-label="Filtrar por prioridad">${options(state.catalogs.prioridades, "", "nivel", "nombre", "Toda prioridad")}</select>
          <select class="select" id="patient-order" aria-label="Ordenar pacientes">
            <option value="nombre:asc">Nombre A–Z</option>
            <option value="nombre:desc">Nombre Z–A</option>
            <option value="fechaIngreso:desc">Ingreso reciente</option>
            <option value="fechaIngreso:asc">Ingreso antiguo</option>
            <option value="prioridad:asc">Mayor prioridad</option>
          </select>
          <button class="button button--secondary button--small" type="button" data-reset-filters>Limpiar</button>
        </div>
        <div id="patients-table">${renderLoadingState("Consultando registros…")}</div>
      </article>
    </section>
  `;

  const tableContainer = container.querySelector("#patients-table");
  const searchInput = container.querySelector("#patient-search");
  const areaSelect = container.querySelector("#patient-area");
  const statusSelect = container.querySelector("#patient-status");
  const prioritySelect = container.querySelector("#patient-priority");
  const orderSelect = container.querySelector("#patient-order");

  const loadPatients = async () => {
    const requestNumber = ++state.requestNumber;
    tableContainer.innerHTML = renderLoadingState("Actualizando pacientes…");
    try {
      const payload = await api.getPatients(state.filters);
      if (requestNumber !== state.requestNumber || !container.isConnected) return;
      state.patients = unwrapCollection(payload, ["pacientes"]);
      tableContainer.innerHTML = tableMarkup(state.patients, state.catalogs);
    } catch (error) {
      if (requestNumber !== state.requestNumber || !container.isConnected) return;
      tableContainer.innerHTML = renderErrorState(error.message);
      tableContainer.querySelector("[data-retry]")?.addEventListener("click", loadPatients);
    }
  };

  const refreshAfterSave = async () => loadPatients();
  const openForm = (patient = null) => openPatientForm({ patient, catalogs: state.catalogs, onSaved: refreshAfterSave });

  container.querySelector("[data-new-patient]").addEventListener("click", () => openForm());
  container.querySelector("[data-reset-filters]").addEventListener("click", () => {
    searchInput.value = "";
    areaSelect.value = "";
    statusSelect.value = "";
    prioritySelect.value = "";
    orderSelect.value = "nombre:asc";
    state.filters = { buscar: "", area: "", estado: "", prioridad: "", orden: "nombre", direccion: "asc" };
    loadPatients();
  });

  searchInput.addEventListener(
    "input",
    debounce(() => {
      state.filters.buscar = searchInput.value.trim();
      loadPatients();
    }, 300),
  );

  areaSelect.addEventListener("change", () => {
    state.filters.area = areaSelect.value;
    loadPatients();
  });
  statusSelect.addEventListener("change", () => {
    state.filters.estado = statusSelect.value;
    loadPatients();
  });
  prioritySelect.addEventListener("change", () => {
    state.filters.prioridad = prioritySelect.value;
    loadPatients();
  });
  orderSelect.addEventListener("change", () => {
    const [order, direction] = orderSelect.value.split(":");
    state.filters.orden = order;
    state.filters.direccion = direction;
    loadPatients();
  });

  tableContainer.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-action]");
    if (!button) return;
    const patient = state.patients.find((item) => String(item.id) === button.dataset.id);
    if (!patient) return;

    if (button.dataset.action === "view") {
      openPatientDetail(patient.id, { onEdit: openForm });
    } else if (button.dataset.action === "edit") {
      openForm(patient);
    } else if (button.dataset.action === "delete") {
      const confirmed = await confirmModal({
        title: "Eliminar paciente",
        message: `Se eliminará la ficha de ${patientName(patient)} y se retirarán sus relaciones operativas activas.`,
        confirmText: "Eliminar ficha",
        danger: true,
      });
      if (!confirmed) return;
      setButtonBusy(button, true, "");
      try {
        await api.deletePatient(patient.id);
        showToast("La ficha del paciente fue eliminada.", { type: "success" });
        await loadPatients();
      } catch (error) {
        showToast(error.message, { type: "error" });
        setButtonBusy(button, false);
      }
    }
  });

  await loadPatients();
  if (detailId && container.isConnected) {
    openPatientDetail(detailId, { onEdit: openForm });
  }

  return () => {
    state.requestNumber += 1;
  };
}
