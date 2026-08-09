import { api } from "../api.js";
import { icon } from "../icons.js";
import {
  PRIORITIES,
  escapeHTML,
  formatTime,
  getPriorityName,
  insertionSort,
  patientName,
  priorityBadge,
  serializeForm,
  setButtonBusy,
  statusBadge,
  toLocalDateTimeInput,
  unwrapCollection,
  waitLabel,
} from "../utils.js";
import { confirmModal, openModal } from "../components/modal.js";
import { renderErrorState, renderLoadingState, renderTable } from "../components/table.js";
import { showToast } from "../components/toast.js";
import { openPatientDetail } from "./pacientes.js";

function priorityOptions(priorities, selected = "") {
  return priorities
    .map(
      (priority) =>
        `<option value="${priority.nivel}"${String(priority.nivel) === String(selected) ? " selected" : ""}>Nivel ${priority.nivel} · ${escapeHTML(priority.nombre)}</option>`,
    )
    .join("");
}

function summaryMarkup(summary = [], priorities = PRIORITIES) {
  return priorities
    .map((priority) => {
      const item = summary.find((entry) => Number(entry.nivel) === Number(priority.nivel));
      return `
        <article class="urgency-level urgency-level--${priority.nivel}">
          <strong>${Number(item?.cantidad) || 0}</strong>
          <span>Nivel ${priority.nivel} · ${escapeHTML(item?.nombre || priority.nombre)}</span>
        </article>
      `;
    })
    .join("");
}

function emergencyTable(rows, priorities) {
  return renderTable({
    rows,
    rowKey: "pacienteId",
    emptyMessage: "No hay pacientes esperando atención en urgencias.",
    caption: `${rows.length} ${rows.length === 1 ? "paciente en la lista" : "pacientes en la lista"}`,
    columns: [
      {
        label: "Paciente",
        render: (row) => `<span class="table-primary__copy"><strong>${escapeHTML(row.nombre || `Paciente ${row.pacienteId}`)}</strong><small>HC ${escapeHTML(row.historiaClinica || row.pacienteId)}</small></span>`,
      },
      {
        label: "Prioridad",
        render: (row) => priorityBadge(row.prioridad, row.prioridadNombre || getPriorityName(row.prioridad, priorities)),
      },
      { label: "Llegada", render: (row) => formatTime(row.horaLlegada) },
      {
        label: "Tiempo esperando",
        render: (row) => `<strong style="color:${Number(row.tiempoEsperaMin) >= 60 ? "var(--color-danger)" : "inherit"}">${waitLabel(row.tiempoEsperaMin)}</strong>`,
      },
      { label: "Estado", render: (row) => statusBadge(row.estado) },
      { label: "Área", render: (row) => escapeHTML(row.areaActual || "Urgencias") },
      {
        label: "Acciones",
        align: "right",
        render: (row) => `
          <div class="table-actions">
            <button class="table-action" type="button" data-action="view" data-patient-id="${escapeHTML(row.pacienteId)}" aria-label="Ver paciente" title="Ver paciente">${icon("eye")}</button>
            <button class="table-action" type="button" data-action="call" data-patient-id="${escapeHTML(row.pacienteId)}" aria-label="Llamar paciente" title="Llamar paciente">${icon("phone")}</button>
            <button class="table-action" type="button" data-action="update" data-patient-id="${escapeHTML(row.pacienteId)}" aria-label="Actualizar atención" title="Actualizar atención">${icon("edit")}</button>
            <button class="table-action" type="button" data-action="bed" data-patient-id="${escapeHTML(row.pacienteId)}" aria-label="Asignar cama" title="Asignar cama">${icon("beds")}</button>
          </div>
        `,
      },
    ],
  });
}

async function openAdmissionModal({ currentRows, priorities, onSaved }) {
  const modal = openModal({
    title: "Ingresar a urgencias",
    description: "Selecciona el paciente y registra la prioridad indicada por el personal.",
    content: renderLoadingState("Consultando pacientes…"),
    closeOnBackdrop: false,
  });

  try {
    const payload = await api.getPatients({ orden: "nombre", direccion: "asc" });
    const currentIds = new Set(currentRows.map((row) => String(row.pacienteId)));
    const available = unwrapCollection(payload, ["pacientes"]).filter(
      (patient) => !currentIds.has(String(patient.id)),
    );

    if (!available.length) {
      modal.body.innerHTML = `
        <div class="notice">${icon("info")}<span>No hay pacientes disponibles para un nuevo ingreso. Registra una ficha o revisa los ingresos activos.</span></div>
      `;
      modal.setFooter('<button class="button button--secondary" type="button" data-close>Cerrar</button>');
      modal.footer.querySelector("[data-close]").addEventListener("click", () => modal.close());
      return;
    }

    modal.body.innerHTML = `
      <form id="emergency-admission-form" novalidate>
        <div class="form-alert" role="alert" hidden></div>
        <div class="form-grid">
          <label class="field field--full">
            <span class="field__label">Paciente <span class="field__required">*</span></span>
            <select class="select" name="pacienteId" required autofocus>
              <option value="">Seleccionar paciente</option>
              ${available.map((patient) => `<option value="${escapeHTML(patient.id)}">${escapeHTML(patientName(patient))} · HC ${escapeHTML(patient.historiaClinica || patient.id)}</option>`).join("")}
            </select>
          </label>
          <label class="field">
            <span class="field__label">Prioridad <span class="field__required">*</span></span>
            <select class="select" name="prioridad" required>${priorityOptions(priorities, 3)}</select>
          </label>
          <label class="field">
            <span class="field__label">Hora de llegada <span class="field__required">*</span></span>
            <input class="input" name="horaLlegada" type="datetime-local" value="${toLocalDateTimeInput()}" required />
          </label>
        </div>
      </form>
    `;
    modal.setFooter(`
      <button class="button button--secondary" type="button" data-cancel>Cancelar</button>
      <button class="button button--primary" type="submit" form="emergency-admission-form" data-save>Registrar ingreso</button>
    `);
    modal.footer.querySelector("[data-cancel]").addEventListener("click", () => modal.close());
    const form = modal.body.querySelector("form");
    const saveButton = modal.footer.querySelector("[data-save]");
    const alert = form.querySelector(".form-alert");
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (!form.reportValidity()) return;
      const data = serializeForm(form);
      data.pacienteId = Number(data.pacienteId);
      data.prioridad = Number(data.prioridad);
      data.horaLlegada = new Date(data.horaLlegada).toISOString();
      setButtonBusy(saveButton, true, "Registrando…");
      try {
        await api.admitEmergency(data);
        modal.close("saved");
        showToast("El ingreso a urgencias fue registrado.", { type: "success" });
        await onSaved();
      } catch (error) {
        alert.textContent = error.message;
        alert.hidden = false;
      } finally {
        setButtonBusy(saveButton, false);
      }
    });
  } catch (error) {
    modal.body.innerHTML = renderErrorState(error.message, "Cerrar");
    modal.body.querySelector("[data-retry]")?.addEventListener("click", () => modal.close());
  }
}

function openUpdateModal({ row, priorities, onSaved }) {
  const normalizedStatus = String(row.estadoCodigo || row.estado)
    .toLocaleLowerCase("es")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/^en /, "");
  const modal = openModal({
    title: "Actualizar atención",
    description: `${row.nombre || `Paciente ${row.pacienteId}`} · HC ${row.historiaClinica || row.pacienteId}`,
    content: `
      <form id="emergency-update-form">
        <div class="form-alert" role="alert" hidden></div>
        <div class="form-grid">
          <label class="field">
            <span class="field__label">Prioridad</span>
            <select class="select" name="prioridad" autofocus>${priorityOptions(priorities, row.prioridad)}</select>
          </label>
          <label class="field">
            <span class="field__label">Estado de atención</span>
            <select class="select" name="estado">
              ${[
                { value: "espera", label: "En espera" },
                { value: "llamado", label: "Llamado" },
                { value: "atencion", label: "En atención" },
              ].map((status) => `<option value="${status.value}"${status.value === normalizedStatus ? " selected" : ""}>${status.label}</option>`).join("")}
            </select>
          </label>
        </div>
      </form>
    `,
    closeOnBackdrop: false,
  });
  modal.setFooter(`
    <button class="button button--danger" type="button" data-remove>Retirar de la lista</button>
    <button class="button button--secondary" type="button" data-cancel>Cancelar</button>
    <button class="button button--primary" type="submit" form="emergency-update-form" data-save>Guardar cambios</button>
  `);
  modal.footer.querySelector("[data-cancel]").addEventListener("click", () => modal.close());
  const form = modal.body.querySelector("form");
  const alert = form.querySelector(".form-alert");
  const saveButton = modal.footer.querySelector("[data-save]");
  const removeButton = modal.footer.querySelector("[data-remove]");

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const data = serializeForm(form);
    data.prioridad = Number(data.prioridad);
    setButtonBusy(saveButton, true, "Guardando…");
    try {
      await api.updateEmergency(row.pacienteId, data);
      modal.close("saved");
      showToast("La atención fue actualizada.", { type: "success" });
      await onSaved();
    } catch (error) {
      alert.textContent = error.message;
      alert.hidden = false;
    } finally {
      setButtonBusy(saveButton, false);
    }
  });

  removeButton.addEventListener("click", async () => {
    const confirmed = await confirmModal({
      title: "Retirar de urgencias",
      message: "El paciente dejará de aparecer en la lista de atención activa.",
      confirmText: "Retirar paciente",
      danger: true,
    });
    if (!confirmed) return;
    try {
      await api.removeEmergency(row.pacienteId);
      modal.close("removed");
      showToast("El paciente fue retirado de la lista.", { type: "success" });
      await onSaved();
    } catch (error) {
      showToast(error.message, { type: "error" });
    }
  });
}

async function openBedAssignment({ row, onSaved }) {
  const modal = openModal({
    title: "Asignar cama",
    description: `${row.nombre || `Paciente ${row.pacienteId}`} · selecciona una cama disponible.`,
    content: renderLoadingState("Consultando disponibilidad…"),
    closeOnBackdrop: false,
  });

  try {
    const payload = await api.getBeds({ ocupada: false });
    const beds = unwrapCollection(payload, ["camas"]).filter((bed) => !bed.ocupada);
    if (!beds.length) {
      modal.body.innerHTML = `<div class="notice notice--warning">${icon("warning")}<span>No hay camas disponibles en este momento.</span></div>`;
      modal.setFooter('<button class="button button--secondary" type="button" data-close>Cerrar</button>');
      modal.footer.querySelector("[data-close]").addEventListener("click", () => modal.close());
      return;
    }

    modal.body.innerHTML = `
      <form id="assign-bed-form">
        <div class="form-alert" role="alert" hidden></div>
        <label class="field">
          <span class="field__label">Cama disponible</span>
          <select class="select" name="camaId" required autofocus>
            ${beds.map((bed) => `<option value="${escapeHTML(bed.id)}">${escapeHTML(bed.codigo)} · ${escapeHTML(bed.area)}</option>`).join("")}
          </select>
        </label>
      </form>
    `;
    modal.setFooter(`
      <button class="button button--secondary" type="button" data-cancel>Cancelar</button>
      <button class="button button--primary" type="submit" form="assign-bed-form" data-save>Asignar cama</button>
    `);
    modal.footer.querySelector("[data-cancel]").addEventListener("click", () => modal.close());
    const form = modal.body.querySelector("form");
    const saveButton = modal.footer.querySelector("[data-save]");
    const alert = form.querySelector(".form-alert");
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const data = serializeForm(form);
      setButtonBusy(saveButton, true, "Asignando…");
      try {
        await api.assignBed({ camaId: data.camaId, pacienteId: row.pacienteId });
        modal.close("saved");
        showToast("La cama fue asignada correctamente.", { type: "success" });
        await onSaved();
      } catch (error) {
        alert.textContent = error.message;
        alert.hidden = false;
      } finally {
        setButtonBusy(saveButton, false);
      }
    });
  } catch (error) {
    modal.body.innerHTML = renderErrorState(error.message, "Cerrar");
    modal.body.querySelector("[data-retry]")?.addEventListener("click", () => modal.close());
  }
}

export async function render(container, context = {}) {
  const state = {
    rows: [],
    summary: [],
    priorities: PRIORITIES,
    order: "prioridad",
    search: "",
    requestNumber: 0,
  };
  container.innerHTML = renderLoadingState("Cargando lista de urgencias…");

  const catalogs = await api.getCatalogs().catch(() => ({ prioridades: PRIORITIES }));
  state.priorities = catalogs?.prioridades?.length ? catalogs.prioridades : PRIORITIES;

  container.innerHTML = `
    <section class="page" aria-labelledby="emergency-title">
      <header class="page-header">
        <div class="page-header__copy">
          <p class="eyebrow">Atención inmediata</p>
          <h1 class="page-title" id="emergency-title">Urgencias</h1>
          <p class="page-description">Supervisa la espera y coordina el llamado según la prioridad registrada.</p>
        </div>
        <div class="page-header__actions">
          <button class="button button--secondary" type="button" data-admit>${icon("plus")} Ingresar paciente</button>
          <button class="button button--primary" type="button" data-call-next>${icon("phone")} Llamar siguiente</button>
        </div>
      </header>
      <div class="urgency-summary" id="emergency-summary">${summaryMarkup([], state.priorities)}</div>
      <article class="card">
        <div class="toolbar">
          <div class="input-wrap toolbar__grow">
            ${icon("search")}
            <label class="sr-only" for="emergency-search">Buscar en urgencias</label>
            <input class="input" id="emergency-search" type="search" placeholder="Buscar paciente o historia clínica" />
          </div>
          <label class="sr-only" for="emergency-order">Ordenar lista</label>
          <select class="select" id="emergency-order">
            <option value="prioridad">Mayor prioridad</option>
            <option value="espera">Mayor tiempo de espera</option>
            <option value="nombre">Nombre A–Z</option>
          </select>
          <button class="button button--secondary button--small" type="button" data-refresh>${icon("refresh")} Actualizar</button>
        </div>
        <div id="emergency-table">${renderLoadingState("Consultando atenciones…")}</div>
      </article>
    </section>
  `;

  const tableContainer = container.querySelector("#emergency-table");
  const summaryContainer = container.querySelector("#emergency-summary");
  const searchInput = container.querySelector("#emergency-search");
  const orderSelect = container.querySelector("#emergency-order");

  const paintTable = () => {
    const query = state.search.toLocaleLowerCase("es");
    let visible = state.rows.filter((row) => {
      const content = `${row.nombre || ""} ${row.historiaClinica || ""}`.toLocaleLowerCase("es");
      return !query || content.includes(query);
    });

    if (state.order === "nombre") {
      visible = insertionSort(visible, (a, b) => String(a.nombre || "").localeCompare(String(b.nombre || ""), "es"));
    } else if (state.order === "espera") {
      visible = insertionSort(visible, (a, b) => Number(b.tiempoEsperaMin || 0) - Number(a.tiempoEsperaMin || 0));
    } else {
      visible = insertionSort(visible, (a, b) => {
        const priorityDifference = Number(a.prioridad || 5) - Number(b.prioridad || 5);
        return priorityDifference || Number(b.tiempoEsperaMin || 0) - Number(a.tiempoEsperaMin || 0);
      });
    }
    tableContainer.innerHTML = emergencyTable(visible, state.priorities);
  };

  const load = async () => {
    const request = ++state.requestNumber;
    tableContainer.innerHTML = renderLoadingState("Actualizando lista…");
    try {
      const payload = await api.getEmergency({ orden: state.order });
      if (request !== state.requestNumber || !container.isConnected) return;
      state.rows = unwrapCollection(payload, ["pacientes"]);
      state.summary = payload?.resumenPorPrioridad || [];
      summaryContainer.innerHTML = summaryMarkup(state.summary, state.priorities);
      paintTable();
    } catch (error) {
      if (request !== state.requestNumber || !container.isConnected) return;
      tableContainer.innerHTML = renderErrorState(error.message);
      tableContainer.querySelector("[data-retry]")?.addEventListener("click", load);
    }
  };

  container.querySelector("[data-admit]").addEventListener("click", () =>
    openAdmissionModal({ currentRows: state.rows, priorities: state.priorities, onSaved: load }),
  );
  container.querySelector("[data-refresh]").addEventListener("click", load);
  container.querySelector("[data-call-next]").addEventListener("click", async (event) => {
    const button = event.currentTarget;
    setButtonBusy(button, true, "Llamando…");
    try {
      const result = await api.callNextPatient();
      const calledName = result?.paciente ? patientName(result.paciente) : result?.ingreso?.nombre || "El siguiente paciente";
      showToast(`${calledName} fue llamado para atención.`, { type: "success", duration: 6000 });
      await load();
    } catch (error) {
      showToast(error.message, { type: error.status === 409 ? "warning" : "error" });
    } finally {
      setButtonBusy(button, false);
    }
  });

  searchInput.addEventListener("input", () => {
    state.search = searchInput.value.trim();
    paintTable();
  });
  orderSelect.addEventListener("change", () => {
    state.order = orderSelect.value;
    load();
  });

  tableContainer.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-action]");
    if (!button) return;
    const row = state.rows.find((item) => String(item.pacienteId) === button.dataset.patientId);
    if (!row) return;

    if (button.dataset.action === "view") {
      openPatientDetail(row.pacienteId, {
        onEdit: () => context.navigate?.("/pacientes", { detalle: row.pacienteId }),
      });
    } else if (button.dataset.action === "update") {
      openUpdateModal({ row, priorities: state.priorities, onSaved: load });
    } else if (button.dataset.action === "bed") {
      openBedAssignment({ row, onSaved: load });
    } else if (button.dataset.action === "call") {
      setButtonBusy(button, true, "");
      try {
        await api.updateEmergency(row.pacienteId, { estado: "Llamado" });
        showToast(`${row.nombre || "El paciente"} fue llamado.`, { type: "success" });
        await load();
      } catch (error) {
        showToast(error.message, { type: "error" });
        setButtonBusy(button, false);
      }
    }
  });

  await load();
  return () => {
    state.requestNumber += 1;
  };
}
