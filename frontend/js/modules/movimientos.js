import { api } from "../api.js";
import { icon } from "../icons.js";
import {
  DEFAULT_AREAS,
  escapeHTML,
  formatDateTime,
  insertionSort,
  patientName,
  serializeForm,
  setButtonBusy,
  toLocalDateTimeInput,
  unwrapCollection,
} from "../utils.js";
import { confirmModal, openModal } from "../components/modal.js";
import { renderEmptyState, renderErrorState, renderLoadingState, renderTable } from "../components/table.js";
import { showToast } from "../components/toast.js";
import { openPatientDetail } from "./pacientes.js";

function movementTable(movements) {
  return renderTable({
    rows: movements,
    emptyMessage: "Este paciente todavía no tiene movimientos registrados.",
    columns: [
      { label: "Área", render: (movement) => `<strong>${escapeHTML(movement.area || movement.areaDestino || "Sin área")}</strong>` },
      { label: "Descripción", render: (movement) => escapeHTML(movement.descripcion || "Cambio de ubicación") },
      {
        label: "Estado",
        render: (movement) => `<span class="badge badge--${movement.estado === "pendiente" ? "warning" : "success"}">${movement.estado === "pendiente" ? "Pendiente" : "Completado"}</span>`,
      },
      { label: "Fecha y hora", render: (movement) => formatDateTime(movement.fecha) },
      {
        label: "Acciones",
        align: "right",
        render: (movement) => `
          <div class="table-actions">
            <button class="table-action" type="button" data-movement-action="edit" data-movement-id="${escapeHTML(movement.id)}" aria-label="Editar movimiento" title="Editar movimiento">${icon("edit")}</button>
            <button class="table-action table-action--danger" type="button" data-movement-action="delete" data-movement-id="${escapeHTML(movement.id)}" aria-label="Eliminar movimiento" title="Eliminar movimiento">${icon("trash")}</button>
          </div>
        `,
      },
    ],
  });
}

function movementTimeline(movements) {
  if (!movements.length) {
    return renderEmptyState("Este paciente todavía no tiene movimientos registrados.", { icon: "movement" });
  }

  return `<div class="card__body"><div class="timeline">${movements
    .map(
      (movement) => `
        <div class="timeline-item">
          <span class="timeline-item__rail" aria-hidden="true"></span>
          <div class="timeline-item__copy">
            <strong>${escapeHTML(movement.area || movement.areaDestino || "Actualización")}</strong>
            <p>${escapeHTML(movement.descripcion || "Cambio de ubicación registrado")}</p>
            <span class="badge badge--${movement.estado === "pendiente" ? "warning" : "success"}" style="margin-top:6px">${movement.estado === "pendiente" ? "Pendiente" : "Completado"}</span>
            <div class="table-actions" style="justify-content:flex-start;margin-top:6px">
              <button class="button button--ghost button--small" type="button" data-movement-action="edit" data-movement-id="${escapeHTML(movement.id)}">Editar</button>
              <button class="button button--ghost button--small" type="button" data-movement-action="delete" data-movement-id="${escapeHTML(movement.id)}">Eliminar</button>
            </div>
          </div>
          <time class="timeline-item__time">${formatDateTime(movement.fecha)}</time>
        </div>
      `,
    )
    .join("")}</div></div>`;
}

function friendlyAction(action) {
  const type = String(action.tipo || action.type || "").toUpperCase();
  if (type.includes("CAMBIO_AREA") || type.includes("MOVIMIENTO")) return "Cambio de ubicación";
  if (type.includes("ASIGN") && type.includes("CAMA")) return "Asignación de cama";
  if (type.includes("LIBER") && type.includes("CAMA")) return "Liberación de cama";
  if (type.includes("URGEN")) return "Actualización de urgencias";
  if (type.includes("PACIENTE")) return "Actualización de paciente";
  return action.titulo || "Actualización operativa";
}

function activityMarkup(payload) {
  const actions = unwrapCollection(payload, ["acciones", "actividad"]);
  if (!actions.length) {
    return `<p class="page-description">No hay actividad reciente disponible.</p>`;
  }

  return `<div class="timeline">${actions.slice(0, 8)
    .map(
      (action) => `
        <div class="timeline-item">
          <span class="timeline-item__rail" aria-hidden="true"></span>
          <div class="timeline-item__copy">
            <strong>${escapeHTML(friendlyAction(action))}</strong>
            <p>${escapeHTML(action.descripcion || action.detalle || (action.pacienteId ? `Paciente ${action.pacienteId}` : "Cambio registrado"))}</p>
          </div>
          <time class="timeline-item__time">${formatDateTime(action.fecha)}</time>
        </div>
      `,
    )
    .join("")}</div>`;
}

function openMovementForm({ movement = null, patients, areas, selectedPatientId, onSaved }) {
  const editing = Boolean(movement?.id);
  const modal = openModal({
    title: editing ? "Editar movimiento" : "Registrar movimiento",
    description: editing
      ? "Corrige la información del evento seleccionado."
      : "La ubicación del paciente y su historial se actualizarán automáticamente.",
    content: `
      <form id="movement-form">
        <div class="form-alert" role="alert" hidden></div>
        <div class="form-grid">
          <label class="field field--full">
            <span class="field__label">Paciente <span class="field__required">*</span></span>
            <select class="select" name="pacienteId" ${editing ? "disabled" : ""} required autofocus>
              <option value="">Seleccionar paciente</option>
              ${patients.map((patient) => `<option value="${escapeHTML(patient.id)}"${String(patient.id) === String(movement?.pacienteId || selectedPatientId || "") ? " selected" : ""}>${escapeHTML(patientName(patient))} · HC ${escapeHTML(patient.historiaClinica || patient.id)} · ${escapeHTML(patient.areaActual || "Sin área")}</option>`).join("")}
            </select>
          </label>
          <label class="field">
            <span class="field__label">Nueva área <span class="field__required">*</span></span>
            <select class="select" name="area" required>
              <option value="">Seleccionar área</option>
              ${areas.map((area) => `<option value="${escapeHTML(area)}"${area === (movement?.area || movement?.areaDestino) ? " selected" : ""}>${escapeHTML(area)}</option>`).join("")}
            </select>
          </label>
          <label class="field">
            <span class="field__label">Fecha y hora <span class="field__required">*</span></span>
            <input class="input" name="fecha" type="datetime-local" value="${toLocalDateTimeInput(movement?.fecha)}" required />
          </label>
          <label class="field field--full">
            <span class="field__label">Estado del traslado <span class="field__required">*</span></span>
            <select class="select" name="estado" required>
              ${
                movement?.estado === "completado"
                  ? '<option value="completado" selected>Traslado completado</option>'
                  : `<option value="pendiente"${!movement || movement.estado === "pendiente" ? " selected" : ""}>Solicitud pendiente</option><option value="completado">Traslado completado</option>`
              }
            </select>
            <span class="field__hint">Al completar el traslado se actualizará la ubicación actual del paciente.</span>
          </label>
          <label class="field field--full">
            <span class="field__label">Descripción</span>
            <textarea class="textarea" name="descripcion" maxlength="240" placeholder="Motivo o detalle operativo del traslado">${escapeHTML(movement?.descripcion || "")}</textarea>
            <span class="field__hint">Opcional · máximo 240 caracteres</span>
          </label>
        </div>
      </form>
    `,
    closeOnBackdrop: false,
  });
  modal.setFooter(`
    <button class="button button--secondary" type="button" data-cancel>Cancelar</button>
    <button class="button button--primary" type="submit" form="movement-form" data-save>${editing ? "Guardar cambios" : "Registrar movimiento"}</button>
  `);
  modal.footer.querySelector("[data-cancel]").addEventListener("click", () => modal.close());
  const form = modal.body.querySelector("form");
  const saveButton = modal.footer.querySelector("[data-save]");
  const alert = form.querySelector(".form-alert");
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    const data = serializeForm(form);
    data.pacienteId = Number(editing ? movement.pacienteId : data.pacienteId);
    data.fecha = new Date(data.fecha).toISOString();
    setButtonBusy(saveButton, true, editing ? "Guardando…" : "Registrando…");
    try {
      if (editing) await api.updateMovement(movement.id, data);
      else await api.createMovement(data);
      modal.close("saved");
      const completed = data.estado === "completado";
      showToast(editing ? "El movimiento fue actualizado." : completed ? "El traslado y la ubicación fueron registrados." : "La solicitud de traslado quedó pendiente.", {
        type: "success",
      });
      await onSaved(data.pacienteId);
    } catch (error) {
      alert.textContent = error.message;
      alert.hidden = false;
    } finally {
      setButtonBusy(saveButton, false);
    }
  });
}

export async function render(container, context = {}) {
  const state = {
    patients: [],
    areas: DEFAULT_AREAS,
    movements: [],
    selectedPatientId: context.route?.query?.get("pacienteId") || "",
    view: "timeline",
    movementRequest: 0,
  };
  container.innerHTML = renderLoadingState("Cargando movimientos…");

  try {
    const [patientsPayload, catalogs] = await Promise.all([
      api.getPatients({ orden: "nombre", direccion: "asc" }),
      api.getCatalogs().catch(() => ({ areas: DEFAULT_AREAS })),
    ]);
    state.patients = unwrapCollection(patientsPayload, ["pacientes"]);
    state.areas = catalogs?.areas?.length ? catalogs.areas : DEFAULT_AREAS;
    if (
      state.selectedPatientId &&
      !state.patients.some((patient) => String(patient.id) === String(state.selectedPatientId))
    ) {
      state.selectedPatientId = "";
    }
    if (!state.selectedPatientId && state.patients.length) state.selectedPatientId = String(state.patients[0].id);
  } catch (error) {
    container.innerHTML = renderErrorState(error.message);
    container.querySelector("[data-retry]")?.addEventListener("click", () => render(container, context));
    return null;
  }

  container.innerHTML = `
    <section class="page" aria-labelledby="movements-title">
      <header class="page-header">
        <div class="page-header__copy">
          <p class="eyebrow">Trazabilidad interna</p>
          <h1 class="page-title" id="movements-title">Movimientos de pacientes</h1>
          <p class="page-description">Registra traslados, consulta el historial y revierte la última acción compatible.</p>
        </div>
        <div class="page-header__actions">
          <button class="button button--secondary" type="button" data-undo>${icon("undo")} Deshacer última acción</button>
          <button class="button button--primary" type="button" data-new-movement>${icon("plus")} Registrar movimiento</button>
        </div>
      </header>
      <div class="section-grid section-grid--two">
        <article class="card">
          <header class="card__header">
            <div class="card__heading"><h2 class="card__title">Historial del paciente</h2><p class="card__subtitle">Ubicaciones y eventos durante su estancia</p></div>
            <div class="segmented" aria-label="Vista del historial">
              <button class="is-active" type="button" data-view="timeline">Secuencia</button>
              <button type="button" data-view="table">Tabla</button>
            </div>
          </header>
          <div class="toolbar">
            <label class="sr-only" for="movement-patient">Seleccionar paciente</label>
            <select class="select toolbar__grow" id="movement-patient">
              ${
                state.patients.length
                  ? state.patients.map((patient) => `<option value="${escapeHTML(patient.id)}"${String(patient.id) === String(state.selectedPatientId) ? " selected" : ""}>${escapeHTML(patientName(patient))} · HC ${escapeHTML(patient.historiaClinica || patient.id)}</option>`).join("")
                  : '<option value="">No hay pacientes registrados</option>'
              }
            </select>
            <button class="button button--ghost button--small" type="button" data-view-patient>${icon("eye")} Ver ficha</button>
          </div>
          <div id="movement-history">${renderLoadingState("Consultando historial…")}</div>
        </article>
        <article class="card">
          <header class="card__header">
            <div class="card__heading"><h2 class="card__title">Actividad reciente</h2><p class="card__subtitle">Últimas operaciones registradas</p></div>
            <button class="button button--ghost button--small" type="button" data-refresh-activity>${icon("refresh")} Actualizar</button>
          </header>
          <div class="card__body" id="recent-activity">${renderLoadingState("Consultando actividad…")}</div>
        </article>
      </div>
    </section>
  `;

  const historyContainer = container.querySelector("#movement-history");
  const activityContainer = container.querySelector("#recent-activity");
  const patientSelect = container.querySelector("#movement-patient");

  const paintHistory = () => {
    historyContainer.innerHTML =
      state.view === "table" ? movementTable(state.movements) : movementTimeline(state.movements);
  };

  const loadHistory = async (patientId = state.selectedPatientId) => {
    state.selectedPatientId = String(patientId || "");
    if (!state.selectedPatientId) {
      state.movements = [];
      historyContainer.innerHTML = renderEmptyState("Registra un paciente para comenzar a crear su historial.", {
        icon: "patients",
      });
      return;
    }
    const request = ++state.movementRequest;
    historyContainer.innerHTML = renderLoadingState("Actualizando historial…");
    try {
      const payload = await api.getMovements({ pacienteId: state.selectedPatientId });
      if (request !== state.movementRequest || !container.isConnected) return;
      state.movements = insertionSort(unwrapCollection(payload, ["movimientos", "historial"]), (a, b) => {
        return new Date(b.fecha).getTime() - new Date(a.fecha).getTime();
      });
      paintHistory();
    } catch (error) {
      if (request !== state.movementRequest || !container.isConnected) return;
      historyContainer.innerHTML = renderErrorState(error.message);
      historyContainer.querySelector("[data-retry]")?.addEventListener("click", () => loadHistory());
    }
  };

  const loadActivity = async () => {
    activityContainer.innerHTML = renderLoadingState("Actualizando actividad…");
    try {
      const payload = await api.getActivity();
      if (!container.isConnected) return;
      activityContainer.innerHTML = activityMarkup(payload);
    } catch (error) {
      activityContainer.innerHTML = `<div class="notice notice--warning">${icon("warning")}<span>${escapeHTML(error.message)}</span></div>`;
    }
  };

  const refreshAll = async (patientId = state.selectedPatientId) => {
    if (patientId) {
      state.selectedPatientId = String(patientId);
      patientSelect.value = state.selectedPatientId;
    }
    await Promise.all([loadHistory(), loadActivity()]);
  };

  container.querySelector("[data-new-movement]").addEventListener("click", () => {
    if (!state.patients.length) {
      showToast("Registra un paciente antes de crear un movimiento.", { type: "warning" });
      context.navigate?.("/pacientes");
      return;
    }
    openMovementForm({
      patients: state.patients,
      areas: state.areas,
      selectedPatientId: state.selectedPatientId,
      onSaved: refreshAll,
    });
  });
  container.querySelector("[data-undo]").addEventListener("click", async (event) => {
    const confirmed = await confirmModal({
      title: "Deshacer última acción",
      message: "Se restaurará el estado anterior de la última operación que admita reversión.",
      confirmText: "Deshacer",
    });
    if (!confirmed) return;
    const button = event.currentTarget;
    setButtonBusy(button, true, "Deshaciendo…");
    try {
      await api.undoLastAction();
      showToast("La última acción fue revertida.", { type: "success" });
      await refreshAll();
    } catch (error) {
      showToast(error.message, { type: error.status === 409 ? "warning" : "error" });
    } finally {
      setButtonBusy(button, false);
    }
  });
  container.querySelector("[data-refresh-activity]").addEventListener("click", loadActivity);
  container.querySelector("[data-view-patient]").addEventListener("click", () => {
    if (state.selectedPatientId) openPatientDetail(state.selectedPatientId);
    else showToast("Selecciona un paciente para consultar su ficha.", { type: "warning" });
  });
  patientSelect.addEventListener("change", () => loadHistory(patientSelect.value));
  container.querySelectorAll("[data-view]").forEach((button) => {
    button.addEventListener("click", () => {
      state.view = button.dataset.view;
      container.querySelectorAll("[data-view]").forEach((item) => item.classList.toggle("is-active", item === button));
      paintHistory();
    });
  });

  historyContainer.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-movement-action]");
    if (!button) return;
    const movement = state.movements.find((item) => String(item.id) === button.dataset.movementId);
    if (!movement) return;
    if (button.dataset.movementAction === "edit") {
      openMovementForm({ movement, patients: state.patients, areas: state.areas, onSaved: refreshAll });
      return;
    }

    const confirmed = await confirmModal({
      title: "Eliminar movimiento",
      message: "El evento se retirará del historial del paciente.",
      confirmText: "Eliminar movimiento",
      danger: true,
    });
    if (!confirmed) return;
    try {
      await api.deleteMovement(movement.id);
      showToast("El movimiento fue eliminado.", { type: "success" });
      await refreshAll();
    } catch (error) {
      showToast(error.message, { type: "error" });
    }
  });

  await Promise.all([loadHistory(), loadActivity()]);
  return () => {
    state.movementRequest += 1;
  };
}
