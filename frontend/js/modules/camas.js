import { api } from "../api.js";
import { icon } from "../icons.js";
import {
  DEFAULT_AREAS,
  escapeHTML,
  insertionSort,
  patientName,
  serializeForm,
  setButtonBusy,
  unwrapCollection,
} from "../utils.js";
import { confirmModal, openModal } from "../components/modal.js";
import { renderEmptyState, renderErrorState, renderLoadingState } from "../components/table.js";
import { showToast } from "../components/toast.js";
import { openPatientDetail } from "./pacientes.js";

function calculateSummary(beds) {
  let occupied = 0;
  beds.forEach((bed) => {
    if (bed.ocupada) occupied += 1;
  });
  return { total: beds.length, ocupadas: occupied, disponibles: beds.length - occupied };
}

function statStrip(summary) {
  return `
    <div class="stat-strip" aria-label="Resumen de camas">
      <div class="stat-strip__item"><strong>${Number(summary.total) || 0}</strong><span>Total</span></div>
      <div class="stat-strip__item"><strong style="color:var(--color-success)">${Number(summary.disponibles) || 0}</strong><span>Disponibles</span></div>
      <div class="stat-strip__item"><strong style="color:var(--color-warning)">${Number(summary.ocupadas) || 0}</strong><span>Ocupadas</span></div>
    </div>
  `;
}

function bedGrid(beds) {
  if (!beds.length) {
    return renderEmptyState("No hay camas con los filtros seleccionados.", { icon: "beds" });
  }

  return `<div class="bed-grid">${beds
    .map(
      (bed) => `
        <article class="bed-card ${bed.ocupada ? "bed-card--occupied" : ""}">
          <div class="bed-card__top">
            <span class="bed-card__code"><strong>${escapeHTML(bed.codigo)}</strong><small>${escapeHTML(bed.area)}</small></span>
            <span class="badge badge--${bed.ocupada ? "warning" : "success"}">${bed.ocupada ? "Ocupada" : "Disponible"}</span>
          </div>
          <p class="bed-card__patient">${bed.ocupada ? `Asignada a ${escapeHTML(bed.nombrePaciente || `paciente ${bed.pacienteId || "sin identificar"}`)}` : "Lista para una nueva asignación"}</p>
          <div class="bed-card__actions">
            ${
              bed.ocupada
                ? `<button class="button button--secondary button--small" type="button" data-action="patient" data-bed-id="${escapeHTML(bed.id)}">${icon("eye")} Consultar</button>
                   <button class="button button--ghost button--small" type="button" data-action="release" data-bed-id="${escapeHTML(bed.id)}">Liberar</button>`
                : `<button class="button button--primary button--small button--wide" type="button" data-action="assign" data-bed-id="${escapeHTML(bed.id)}">${icon("plus")} Asignar cama</button>`
            }
          </div>
        </article>
      `,
    )
    .join("")}</div>`;
}

async function openAssignmentModal({ bed, onSaved }) {
  const modal = openModal({
    title: `Asignar ${bed.codigo}`,
    description: `${bed.area} · selecciona el paciente que ocupará esta cama.`,
    content: renderLoadingState("Consultando pacientes…"),
    closeOnBackdrop: false,
  });

  try {
    const payload = await api.getPatients({ orden: "nombre", direccion: "asc" });
    const patients = unwrapCollection(payload, ["pacientes"]).filter(
      (patient) => !patient.cama && !/alta|salida|inactiv/i.test(patient.estado || ""),
    );

    if (!patients.length) {
      modal.body.innerHTML = `<div class="notice notice--warning">${icon("warning")}<span>No hay pacientes activos disponibles para la asignación.</span></div>`;
      modal.setFooter('<button class="button button--secondary" type="button" data-close>Cerrar</button>');
      modal.footer.querySelector("[data-close]").addEventListener("click", () => modal.close());
      return;
    }

    modal.body.innerHTML = `
      <form id="bed-assignment-form">
        <div class="form-alert" role="alert" hidden></div>
        <label class="field">
          <span class="field__label">Paciente <span class="field__required">*</span></span>
          <select class="select" name="pacienteId" required autofocus>
            <option value="">Seleccionar paciente</option>
            ${patients.map((patient) => `<option value="${escapeHTML(patient.id)}">${escapeHTML(patientName(patient))} · HC ${escapeHTML(patient.historiaClinica || patient.id)} · ${escapeHTML(patient.areaActual || "Sin área")}</option>`).join("")}
          </select>
        </label>
      </form>
    `;
    modal.setFooter(`
      <button class="button button--secondary" type="button" data-cancel>Cancelar</button>
      <button class="button button--primary" type="submit" form="bed-assignment-form" data-save>Confirmar asignación</button>
    `);
    modal.footer.querySelector("[data-cancel]").addEventListener("click", () => modal.close());
    const form = modal.body.querySelector("form");
    const saveButton = modal.footer.querySelector("[data-save]");
    const alert = form.querySelector(".form-alert");
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (!form.reportValidity()) return;
      const data = serializeForm(form);
      setButtonBusy(saveButton, true, "Asignando…");
      try {
        await api.assignBed({ camaId: bed.id, pacienteId: Number(data.pacienteId) });
        modal.close("saved");
        showToast(`${bed.codigo} fue asignada correctamente.`, { type: "success" });
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

export async function render(container) {
  const state = {
    beds: [],
    summary: { total: 0, ocupadas: 0, disponibles: 0 },
    areas: ["Urgencias", "UCI", "Hospitalización"],
    area: "",
    availability: "all",
    requestNumber: 0,
  };
  container.innerHTML = renderLoadingState("Cargando disponibilidad de camas…");
  const catalogs = await api.getCatalogs().catch(() => ({ areas: DEFAULT_AREAS }));
  const allowedAreas = (catalogs?.areas || []).filter((area) =>
    ["Urgencias", "UCI", "Hospitalización"].includes(area),
  );
  if (allowedAreas.length) state.areas = allowedAreas;

  container.innerHTML = `
    <section class="page" aria-labelledby="beds-title">
      <header class="page-header">
        <div class="page-header__copy">
          <p class="eyebrow">Capacidad hospitalaria</p>
          <h1 class="page-title" id="beds-title">Administración de camas</h1>
          <p class="page-description">Consulta la ocupación y coordina asignaciones por área.</p>
        </div>
        <div class="page-header__actions">
          <button class="button button--secondary" type="button" data-refresh>${icon("refresh")} Actualizar disponibilidad</button>
        </div>
      </header>
      <div id="bed-summary">${statStrip(state.summary)}</div>
      <article class="card" style="margin-top:20px">
        <div class="toolbar">
          <label class="sr-only" for="bed-area">Filtrar por área</label>
          <select class="select" id="bed-area">
            <option value="">Todas las áreas</option>
            ${state.areas.map((area) => `<option value="${escapeHTML(area)}">${escapeHTML(area)}</option>`).join("")}
          </select>
          <div class="segmented" aria-label="Filtrar por disponibilidad">
            <button class="is-active" type="button" data-availability="all">Todas</button>
            <button type="button" data-availability="available">Disponibles</button>
            <button type="button" data-availability="occupied">Ocupadas</button>
          </div>
        </div>
        <div id="bed-grid">${renderLoadingState("Consultando camas…")}</div>
      </article>
    </section>
  `;

  const grid = container.querySelector("#bed-grid");
  const summary = container.querySelector("#bed-summary");
  const areaSelect = container.querySelector("#bed-area");

  const paint = () => {
    let visible = state.beds.filter((bed) => {
      if (state.area && bed.area !== state.area) return false;
      if (state.availability === "available" && bed.ocupada) return false;
      if (state.availability === "occupied" && !bed.ocupada) return false;
      return true;
    });
    visible = insertionSort(visible, (a, b) => String(a.codigo).localeCompare(String(b.codigo), "es", { numeric: true }));
    grid.innerHTML = bedGrid(visible);
    summary.innerHTML = statStrip(state.summary);
  };

  const load = async () => {
    const request = ++state.requestNumber;
    grid.innerHTML = renderLoadingState("Actualizando disponibilidad…");
    try {
      const payload = await api.getBeds();
      if (request !== state.requestNumber || !container.isConnected) return;
      state.beds = unwrapCollection(payload, ["camas"]);
      state.summary = payload?.resumen || calculateSummary(state.beds);
      paint();
    } catch (error) {
      if (request !== state.requestNumber || !container.isConnected) return;
      grid.innerHTML = renderErrorState(error.message);
      grid.querySelector("[data-retry]")?.addEventListener("click", load);
    }
  };

  container.querySelector("[data-refresh]").addEventListener("click", load);
  areaSelect.addEventListener("change", () => {
    state.area = areaSelect.value;
    paint();
  });
  container.querySelectorAll("[data-availability]").forEach((button) => {
    button.addEventListener("click", () => {
      state.availability = button.dataset.availability;
      container.querySelectorAll("[data-availability]").forEach((item) => item.classList.toggle("is-active", item === button));
      paint();
    });
  });

  grid.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-action]");
    if (!button) return;
    const bed = state.beds.find((item) => String(item.id) === button.dataset.bedId);
    if (!bed) return;

    if (button.dataset.action === "assign") {
      openAssignmentModal({ bed, onSaved: load });
    } else if (button.dataset.action === "patient") {
      openPatientDetail(bed.pacienteId);
    } else if (button.dataset.action === "release") {
      const confirmed = await confirmModal({
        title: `Liberar ${bed.codigo}`,
        message: "La cama quedará disponible y se actualizará la ficha del paciente.",
        confirmText: "Liberar cama",
        danger: true,
      });
      if (!confirmed) return;
      setButtonBusy(button, true, "Liberando…");
      try {
        await api.releaseBed({ camaId: bed.id });
        showToast(`${bed.codigo} ahora está disponible.`, { type: "success" });
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
